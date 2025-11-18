import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { put } from '@vercel/blob';
import path from 'path';

const HORA_INICIO = 5;
const HORA_FIM = 18;
const MAX_LINHAS_HISTORICO = 50; // Limite para o modo de visualização em tempo real (individual)

// Função auxiliar para construir o caminho de dados baseado no ID do sensor
const getCaminhoDados = (sensorId) => {
    // Ex: /public/data/sensor1
    return path.join(process.cwd(), 'public', 'data', `sensor${sensorId}`);
};

// Esta função vai lidar com requisições do tipo POST (dados vindo do ESP32)
export async function POST(request) {
    try {
        // 1. Recebe e valida os dados
        const dados = await request.json();
        const { tensao, corrente, id_sensor } = dados; 

        if (tensao === undefined || corrente === undefined || id_sensor === undefined) {
            return NextResponse.json({ message: 'Dados inválidos. Tensão, corrente e id_sensor são obrigatórios.' }, { status: 400 });
        }
        
        const sensorId = parseInt(id_sensor);
        if (isNaN(sensorId) || sensorId < 1 || sensorId > 3) {
            return NextResponse.json({ message: 'ID do sensor inválido.' }, { status: 400 });
        }

        const PASTA_DE_DADOS_ABSOLUTA = getCaminhoDados(sensorId);
        const timestamp = new Date();
        const horaAtual = timestamp.getHours();
        
        // 2. VERIFICAÇÃO DE HORÁRIO (Salva dados apenas entre HORA_INICIO e HORA_FIM)
        if (horaAtual < HORA_INICIO || horaAtual >= HORA_FIM) {
            const mensagem = `Sensor ${sensorId}: Dados recebidos, mas ignorados. Horário de salvamento: ${HORA_INICIO}h às ${HORA_FIM}h.`;
            console.log(`[POST IGNORADO] ${mensagem} (Hora atual: ${horaAtual}h)`);
            return NextResponse.json({ message: mensagem }, { status: 200 });
        }
        
        const dataFormatada = timestamp.toISOString().split('T')[0];
        const horaFormatada = timestamp.toTimeString().split(' ')[0];
        const nomeArquivoCSV = `dados_${dataFormatada}.csv`;
        
        // 3. Cria a pasta, se necessário
        await fs.mkdir(PASTA_DE_DADOS_ABSOLUTA, { recursive: true });

        // 4. Formata e calcula potência
        const v = parseFloat(tensao);
        const a = parseFloat(corrente);
        const p = v * a;

        const tensaoFormatada = v.toFixed(2);
        const correnteFormatada = a.toFixed(2);
        const potenciaFormatada = p.toFixed(2);

        const linhaCSV = `${dataFormatada},${horaFormatada},${tensaoFormatada},${correnteFormatada},${potenciaFormatada}\n`;

        // 5. Salva os dados no Vercel Blob
        const nomeArquivoBlob = `dados_${dataFormatada}.csv`;

        try {
            await put(nomeArquivoBlob, linhaCSV, {
                access: 'public',
                append: true, // Isto anexa os dados ao ficheiro, em vez de o substituir
                token: process.env.BLOB_READ_WRITE_TOKEN // Token de acesso
            });
            
        // 6. Retorna uma resposta de sucesso
            return NextResponse.json({ message: `Dados do Sensor ${sensorId} recebidos e SALVOS com sucesso!` }, { status: 200 });

        } catch (error) {
            console.error('Erro ao salvar no Vercel Blob:', error);
            return NextResponse.json({ message: 'Erro ao processar a requisição no Blob.' }, { status: 500 });
        }

    } catch (error) {
        console.error('Erro no POST da API:', error);
        return NextResponse.json({ message: 'Erro ao processar a requisição.' }, { status: 500 });
    }
}

// Esta função vai lidar com requisições do tipo GET (dados para o painel, comparação e DOWNLOAD)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get('id');
        // Identifica o modo de requisição: histórico de 50 linhas, histórico completo (gráfico) ou DOWNLOAD COMPLETO
        const getHistory = searchParams.get('history') === 'true';
        const getAllHistory = searchParams.get('all_history') === 'true'; 
        const downloadAll = searchParams.get('download_all') === 'true'; 
        
        const sensorId = parseInt(idParam);
        
        if (isNaN(sensorId) || sensorId < 1 || sensorId > 3) {
            return NextResponse.json({ message: 'ID do sensor inválido ou ausente.' }, { status: 400 });
        }

        const PASTA_DE_DADOS_ABSOLUTA = getCaminhoDados(sensorId);
        // Cria a pasta, se necessário (evita erro ENOENT)
        await fs.mkdir(PASTA_DE_DADOS_ABSOLUTA, { recursive: true });
        const arquivos = await fs.readdir(PASTA_DE_DADOS_ABSOLUTA);

        const arquivosCSV = arquivos
            .filter(file => file.endsWith('.csv'))
            .sort()
            .reverse(); // Garante que o arquivo mais recente está na posição [0]

            // Download
        if (downloadAll) {
            if (arquivosCSV.length === 0) {
                return NextResponse.json({ message: 'Nenhum dado CSV encontrado para download.' }, { status: 404 });
            }

            let linhasConteudo = [];
            // Adiciona o cabeçalho CSV uma vez
            linhasConteudo.push("Data,Hora,Tensao(V),Corrente(A),Potencia(W)"); 

            // Lê TODOS os arquivos em ordem cronológica (sort)
            for (const arquivo of arquivosCSV.sort()) {
                const caminhoCompleto = path.join(PASTA_DE_DADOS_ABSOLUTA, arquivo);
                const conteudo = await fs.readFile(caminhoCompleto, 'utf8');
                // Adiciona o conteúdo do arquivo, removendo linhas vazias
                const linhasArquivo = conteudo.trim().split('\n').filter(line => line.trim() !== '');
                linhasConteudo.push(...linhasArquivo);
            }

            const conteudoCSV = linhasConteudo.join('\n');
            const nomeArquivoDownload = `sensor${sensorId}_historico_completo.csv`;

            // Retorna a resposta como um arquivo para download
            return new NextResponse(conteudoCSV, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${nomeArquivoDownload}"`,
                },
            });
        }
        // ------------------------------------------------------------------


        const defaultResponse = { tensao: 0, corrente: 0, potencia: 0, timestamp: 'Nenhum dado', arquivos: arquivosCSV, historico: [] };

        if (arquivosCSV.length === 0) {
            return NextResponse.json(defaultResponse);
        }

        let linhas = [];
        let arquivoMaisRecente = '';

        if (getAllHistory) {
            // MODO COMPARAÇÃO (Lê TODOS os arquivos)
            for (const arquivo of arquivosCSV.sort()) { // Ordena pelo nome para garantir ordem cronológica
                const conteudo = await fs.readFile(path.join(PASTA_DE_DADOS_ABSOLUTA, arquivo), 'utf8');
                linhas.push(...conteudo.trim().split('\n').filter(line => line.trim() !== ''));
            }
            arquivoMaisRecente = arquivosCSV[0]; 

        } else if (getHistory && arquivosCSV.length > 0) {
            // MODO SENSOR INDIVIDUAL (Lê o arquivo mais recente, limitado a 50 linhas)**
            arquivoMaisRecente = arquivosCSV[0];
            const conteudo = await fs.readFile(path.join(PASTA_DE_DADOS_ABSOLUTA, arquivoMaisRecente), 'utf8');
            const todasLinhas = conteudo.trim().split('\n').filter(line => line.trim() !== '');
            linhas = todasLinhas.slice(-MAX_LINHAS_HISTORICO); // Limita a 50 linhas
        } else {
            // Retorna a resposta padrão
            return NextResponse.json(defaultResponse);
        }


        if (linhas.length === 0) {
            return NextResponse.json(defaultResponse);
        }

        // DADOS RECENTES (Sempre da última linha processada)
        const ultimaLinha = linhas[linhas.length - 1];
        const [data, hora, tensao, corrente, potencia] = ultimaLinha.split(',');

        const dadosMaisRecentes = {
            tensao: parseFloat(tensao),
            corrente: parseFloat(corrente),
            potencia: parseFloat(potencia),
            timestamp: `${data} ${hora}`
        };

        // O histórico é o conjunto de todas as linhas que foram lidas
        const historico = linhas.map(line => {
            const [d, h, v, a, p] = line.split(',');
            return {
                data: d,
                hora: h,
                tensao: parseFloat(v),
                corrente: parseFloat(a),
                potencia: parseFloat(p),
            };
        });

        // Retorna os dados
        return NextResponse.json({ 
            ...dadosMaisRecentes, 
            arquivos: arquivosCSV, 
            historico: historico 
        });

    } catch (error) {
        console.error('Erro no GET da API:', error);
        if (error.code === 'ENOENT') {
            return NextResponse.json({ tensao: 0, corrente: 0, potencia: 0, timestamp: 'Nenhum dado', arquivos: [], historico: [] });
        }
        return NextResponse.json({ message: 'Erro ao ler os dados do sensor.' }, { status: 500 });
    }
}


// Esta função vai lidar com requisições do tipo DELETE (apagar um arquivo específico)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get('id');
        // Parâmetro para identificar o arquivo a ser apagado
        const filename = searchParams.get('filename'); 

        const sensorId = parseInt(idParam);

        if (isNaN(sensorId) || sensorId < 1 || sensorId > 3) {
            return NextResponse.json({ message: 'ID do sensor inválido ou ausente.' }, { status: 400 });
        }
        
        if (!filename) {
            return NextResponse.json({ message: 'Nome do arquivo (filename) é obrigatório para exclusão.' }, { status: 400 });
        }

        const PASTA_DE_DADOS_ABSOLUTA = getCaminhoDados(sensorId);
        const CAMINHO_COMPLETO_ARQUIVO = path.join(PASTA_DE_DADOS_ABSOLUTA, filename);
        
        // 1. Verifica se o arquivo existe antes de tentar apagar
        try {
            await fs.access(CAMINHO_COMPLETO_ARQUIVO);
        } catch (error) {
            if (error.code === 'ENOENT') {
                 return NextResponse.json({ message: `Arquivo ${filename} não encontrado.` }, { status: 404 });
            }
            throw error; // Re-lança outros erros de acesso
        }
        
        // 2. Apaga o arquivo específico
        await fs.unlink(CAMINHO_COMPLETO_ARQUIVO);

        console.log(`[DELETE SUCESSO] Arquivo ${filename} do Sensor ${sensorId} foi apagado.`);
        return NextResponse.json({ message: `Arquivo ${filename} apagado com sucesso!` }, { status: 200 });

    } catch (error) {
        console.error('Erro no DELETE da API:', error);
        return NextResponse.json({ message: 'Erro ao apagar o arquivo do sensor.' }, { status: 500 });
    }
}