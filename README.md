Projeto de Monitoramento Solar em Tempo Real

Aplicação web full-stack para o monitoramento do desempenho de painéis solares, utilizando um ESP32 para a coleta de dados e um dashboard web construído com Next.js para a visualização.

Como Funciona

1.  **Hardware (ESP32):** Um ESP32 lê os dados de tensão e corrente de um sensor (ex: INA219) conectado ao painel solar.
2.  **Envio de Dados:** O ESP32 envia os dados via `POST` HTTP para a API da aplicação a cada segundo.
3.  **Backend (API Routes):** A API do Next.js recebe os dados, calcula a potência (`Tensão * Corrente`) e armazena cada leitura numa nova linha de um arquivo `.csv` correspondente ao dia atual.
4.  **Frontend (Dashboard):** A página web busca (`GET`) os dados do dia atual (`all_history=true`), filtra para exibir apenas as leituras de hoje e alimenta um gráfico `recharts`.

## Principais Funcionalidades

-   **Dashboard em Tempo Real:** Exibe as leituras mais recentes de Tensão (V), Corrente (A) e Potência (W).
-   **Gráfico Dinâmico:** Mostra o desempenho do dia. O eixo de tempo (X) é dinâmico, iniciando sempre às 05:00 e expandindo automaticamente até a hora da última leitura recebida.
-   **Armazenamento em CSV:** Os dados são persistidos em arquivos `.csv` no servidor, organizados por data (ex: `dados_2025-11-17.csv`).
-   **Gerenciamento de Histórico:** A interface lista todos os arquivos `.csv` disponíveis, permitindo o download individual ou a exclusão.

## Tecnologias Utilizadas

-   **Frontend:** React (Next.js 14)
-   **Gráficos:** Recharts
-   **Estilização:** Tailwind CSS
-   **Ícones:** Lucide-React
-   **Backend:** Next.js API Routes (Node.js)
