'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Download } from 'lucide-react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'; 

// DEFINE O ID DO SENSOR
const ID_SENSOR = 2;

interface DadosSensor {
    tensao: number | string;
    corrente: number | string;
    potencia: number | string;
    timestamp: string;
}

interface DadosHistoricos {
    data: string;
    hora: string;
    tensao: number;
    corrente: number;
    potencia: number;
}

const GraficoLinha = ({ dados }: { dados: DadosHistoricos[] }) => {
    // Estado para controlar quais linhas estão ativas (selecionadas)
    const [activeLines, setActiveLines] = useState({
        tensao: true,
        corrente: true,
        potencia: true,
    });

    const TENSE_COLOR = "#3b82f6"; 
    const CURRENT_COLOR = "#10b981";
    const POWER_COLOR = "#f59e0b";


    const handleButtonClick = (dataKey: keyof typeof activeLines) => { 
        setActiveLines(prev => ({
            ...prev,
            [dataKey]: !prev[dataKey]
        }));
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-white border border-gray-300 shadow-lg rounded-md text-sm">
                    <p className="font-bold text-gray-700 mb-1">Hora: {label}</p>
                    {payload.map((p: any, index: number) => (
                        p.stroke !== 'transparent' && (
                            <p key={index} style={{ color: p.color }}>
                                {`${p.name}: ${p.value.toFixed(2)} ${p.unit}`}
                            </p>
                        )
                    ))}
                </div>
            );
        }
        return null;
    };


    const buttonsConfig = [
        { key: 'tensao', label: 'Tensão (V)', color: TENSE_COLOR, unit: 'V' },
        { key: 'corrente', label: 'Corrente (A)', color: CURRENT_COLOR, unit: 'A' },
        { key: 'potencia', label: 'Potência (W)', color: POWER_COLOR, unit: 'W' },
    ];


    return (
        <div className="mt-10 mb-10 bg-gray-50 p-6 rounded-xl shadow-inner">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">
                Gráfico de Desempenho em Tempo Real
            </h2>

            {/* Botões de Filtro */}
            <div className="flex justify-center gap-4 mb-6 flex-wrap">
                {buttonsConfig.map(btn => (
                    <button
                        key={btn.key}
                        onClick={() => handleButtonClick(btn.key as keyof typeof activeLines)}
                        className={`
                            px-4 py-2 rounded-full font-semibold transition-all duration-200 shadow-md
                            ${activeLines[btn.key as keyof typeof activeLines] 
                                ? `text-white border-2 border-transparent` 
                                : `text-gray-600 bg-gray-200 border-2 border-gray-400 hover:bg-gray-300`
                            }
                        `}
                        style={{ backgroundColor: activeLines[btn.key as keyof typeof activeLines] ? btn.color : undefined }}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
            
            {dados.length === 0 ? (
                <p className="text-center text-gray-500 py-10">
                    Carregando dados históricos... (Verificar se o ESP32 está enviando os dados)
                </p>
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart 
                        data={dados} 
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        
                        {/* Eixo X: Hora */}
                        <XAxis 
                            dataKey="hora" 
                            tickFormatter={(tick: string) => tick.split(':').slice(0, 2).join(':')}
                            type="category"
                            domain={['05:00', 'auto']} 
                            minTickGap={30}
                        />

                        {/* Eixo Y Esquerda: Tensão (V) */}
                        <YAxis yAxisId="left" orientation="left" stroke={TENSE_COLOR} label={{ value: 'Tensão (V)', angle: -90, position: 'insideLeft', fill: TENSE_COLOR }} />
                        
                        {/* Eixo Y Direita: Corrente (A) e Potência (W) */}
                        <YAxis yAxisId="right" orientation="right" stroke={CURRENT_COLOR} label={{ value: 'A / W', angle: 90, position: 'insideRight', fill: CURRENT_COLOR }} />
                        
                        <Tooltip content={CustomTooltip} />
                        
                        {/* Curva de Tensão */}
                        <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="tensao" 
                            stroke={activeLines.tensao ? TENSE_COLOR : "transparent"} 
                            strokeWidth={activeLines.tensao ? 2 : 0} 
                            name="Tensão" 
                            unit="V"
                            dot={false}
                            isAnimationActive={false} 
                            animationDuration={0}
                        />

                        {/* Curva de Corrente */}
                        <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="corrente" 
                            stroke={activeLines.corrente ? CURRENT_COLOR : "transparent"} 
                            strokeWidth={activeLines.corrente ? 2 : 0} 
                            name="Corrente" 
                            unit="A"
                            dot={false}
                            isAnimationActive={false}
                            animationDuration={0}
                        />

                        {/* Curva de Potência */}
                        <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="potencia" 
                            stroke={activeLines.potencia ? POWER_COLOR : "transparent"} 
                            strokeWidth={activeLines.potencia ? 2 : 0} 
                            name="Potência" 
                            unit="W"
                            dot={false}
                            isAnimationActive={false} 
                            animationDuration={0}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};


export default function SensorPage() {
    
    const [dadosHistoricos, setDadosHistoricos] = useState<DadosHistoricos[]>([]); 

    const [dadosAtuais, setDadosAtuais] = useState<DadosSensor>({
        tensao: '---',
        corrente: '---',
        potencia: '---',
        timestamp: 'Carregando...'
    });

    const [arquivos, setArquivos] = useState<string[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    

    const [deletingFile, setDeletingFile] = useState<string | null>(null); 

    const handleVoltar = () => {

        window.history.back(); 
    };

    const handleDownloadAll = () => {
        window.location.href = `/api/sensordata?id=${ID_SENSOR}&download_all=true`;
    };

    const handleDeleteFile = async (filename: string) => {
        console.warn(`Atenção: A função de apagar (${filename}) foi chamada. Em um app real, um modal customizado de confirmação seria exibido.`);
        
        const confirmar = window.confirm(
            `ATENÇÃO: Você tem certeza que deseja APAGAR o arquivo ${filename}?`
        );

        if (!confirmar) {
            return;
        }

        setDeletingFile(filename);

        try {
            const response = await fetch(`/api/sensordata?id=${ID_SENSOR}&filename=${filename}`, {
                method: 'DELETE', 
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao apagar o arquivo.');
            }

            setArquivos(prev => prev.filter(f => f !== filename));
            
            console.log(`Arquivo ${filename} apagado com sucesso!`);

        } catch (err) {
            if (err instanceof Error) {
                setErro(`Erro ao apagar o arquivo ${filename}: ${err.message}`);
            } else {
                setErro('Ocorreu um erro desconhecido ao apagar o arquivo.');
            }
            console.error(err);
        } finally {
            setDeletingFile(null); // Limpa o estado de exclusão
        }
    };

    useEffect(() => {
        async function buscarDados() {
            try {
                const response = await fetch(`/api/sensordata?id=${ID_SENSOR}&all_history=true`);
                if (!response.ok) {
                    throw new Error(`Falha ao buscar dados do Sensor ${ID_SENSOR}.`);
                }

                const data = await response.json();
                
                // ATUALIZA DADOS RECENTES
                setDadosAtuais({
                    tensao: parseFloat(data.tensao) || data.tensao,
                    corrente: parseFloat(data.corrente) || data.corrente,
                    potencia: parseFloat(data.potencia) || data.potencia,
                    timestamp: data.timestamp
                });

                //ATUALIZA DADOS HISTÓRICOS (Para o gráfico)
                const hoje = new Date();
                const dataHojeFormatada = hoje.getFullYear() + '-' + 
                                String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                                String(hoje.getDate()).padStart(2, '0');
                
                                const historicoCompleto = data.historico || [];
                                const historicoHoje = historicoCompleto.filter((ponto: DadosHistoricos) => ponto.data === dataHojeFormatada);
                setDadosHistoricos(historicoHoje);                
                //ATUALIZA LISTA DE ARQUIVOS
                setArquivos(data.arquivos || []);
                setErro(null);

            } catch (err) {
                if (err instanceof Error) {
                    setErro(err.message);
                } else {
                    setErro('Ocorreu um erro desconhecido.');
                }
                console.error(err);
            }
        }
        buscarDados();

        // Intervalo de atualização (1 segundo)
        const intervalId = setInterval(buscarDados, 5000);
        return () => clearInterval(intervalId);
    }, []);

    const formatarValor = (valor: number | string) => {
        if (typeof valor === 'number') {
            return valor.toFixed(2);
        }
        return valor;
    };

    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8 relative"> 
            <div className="w-full max-w-6xl bg-white rounded-xl shadow-2xl p-8">
                
                <button
                    onClick={handleVoltar}
                    className="absolute top-4 left-4 lg:top-8 lg:left-8 flex items-center px-4 py-2 text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors shadow-lg text-sm font-semibold z-10"
                >
                    <ArrowLeft size={18} className="mr-2" />
                    Voltar
                </button>

                <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-10 mt-4">
                    Monitoramento Topologia {ID_SENSOR}
                </h1>

                {erro && <p className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4 font-medium">{erro}</p>}

                {/* Bloco de Leituras Atuais */}
                <div className="mb-10">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">
                        Leitura Mais Recente
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                            <p className="text-lg text-blue-800 font-semibold">Tensão (V)</p>
                            <p className="text-5xl font-bold text-blue-900">{formatarValor(dadosAtuais.tensao)} V</p>
                        </div>
                        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                            <p className="text-lg text-green-800 font-semibold">Corrente (A)</p>
                            <p className="text-5xl font-bold text-green-900">{formatarValor(dadosAtuais.corrente)} A</p>
                        </div>
                        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                            <p className="text-lg text-yellow-800 font-semibold">Potência (W)</p>
                            <p className="text-5xl font-bold text-yellow-900">{formatarValor(dadosAtuais.potencia)} W</p>
                        </div>
                    </div>
                    <p className="text-center text-gray-500 mt-4 text-sm">
                        Última atualização: {dadosAtuais.timestamp}
                    </p>
                </div>
                
                <GraficoLinha dados={dadosHistoricos} />
                
                <div>
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4 border-b pb-2">
                        Histórico de Dados por Arquivo
                    </h2>

                    {arquivos.length > 0 && (
                        <div className="mb-6 flex justify-center">
                            <button
                                onClick={handleDownloadAll}
                                className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-800 transition-colors text-lg w-full md:w-auto"
                            >
                                BAIXAR TODOS OS DADOS
                            </button>
                        </div>
                    )}

                    <ul className="space-y-3">
                        {arquivos.length > 0 ? (
                            arquivos.map((arquivo, index) => (
                                <li 
                                    key={index} 
                                    className="flex flex-col md:flex-row items-center justify-between bg-gray-50 p-4 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
                                >
                                    <span className="font-mono text-gray-800 mb-2 md:mb-0 md:flex-1 text-center md:text-left">
                                        {arquivo}
                                    </span>
                                    
                                    <div className="flex gap-3">
                                        <a 
                                            href={`/api/sensordata?id=${ID_SENSOR}&filename=${arquivo}`} 
                                            download={arquivo} 
                                            className="flex items-center px-3 py-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-800 transition-colors text-sm"
                                        >
                                            <Download size={16} className="mr-1" /> Baixar
                                        </a>
                                        
                                        <button
                                            onClick={() => handleDeleteFile(arquivo)}
                                            disabled={deletingFile === arquivo} 
                                            className={`
                                                flex items-center px-3 py-2 font-semibold rounded-md transition-colors text-sm
                                                ${deletingFile === arquivo 
                                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                                                    : 'bg-gray-700 text-white hover:bg-gray-800'
                                                }
                                            `}
                                        >
                                            <Trash2 size={16} className="mr-1" /> 
                                            {deletingFile === arquivo ? 'Apagando...' : 'Apagar'}
                                        </button>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <p className="text-gray-500">Nenhum arquivo de dados encontrado.</p>
                        )}
                    </ul>
                </div>
            </div>
        </main>
    );
}