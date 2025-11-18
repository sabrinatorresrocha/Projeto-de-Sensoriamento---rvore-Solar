// Arquivo: src/app/page.tsx
import Link from 'next/link';
import { Zap, TrendingUp } from 'lucide-react'; // Ícones para deixar mais visual (exige 'lucide-react')

// Se você não usa Tailwind CSS, os estilos precisarão ser adaptados.
export default function HomeDashboard() {
  const botoes = [
    { 
      titulo: 'Topologia 1 (Tradicional)', 
      icone: Zap, 
      descricao: 'Dados de monitoramento do primeiro sistema.', 
      link: '/sensor1', 
      cor: 'bg-yellow-500 hover:bg-yellow-700' 
    },
    { 
      titulo: 'Topologia 2 (Nova)', 
      icone: Zap, 
      descricao: 'Dados de monitoramento do segundo sistema.', 
      link: '/sensor2', 
      cor: 'bg-orange-600 hover:bg-orange-700' 
    },
    { 
      titulo: 'Topologia 3 (Antiga)', 
      icone: Zap, 
      descricao: 'Dados de monitoramento do terceiro sistema.', 
      link: '/sensor3', 
      cor: 'bg-red-500 hover:bg-red-700' 
    },
    { 
      titulo: 'Comparação de Desempenho', 
      icone: TrendingUp, 
      descricao: 'Gráficos e métricas comparando a performance dos 3 sistemas.', 
      link: '/comparacao', 
      cor: 'bg-green-600 hover:bg-green-700' 
    },
  ];

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          PROJETO DE SENSORIAMENTO
        </h1>
        <p className="text-xl text-gray-600">
          Selecione o painel ou veja o desempenho geral.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-6xl">
        {botoes.map((botao) => (
          <Link 
            key={botao.link} 
            href={botao.link}
            className={`flex flex-col items-start p-8 rounded-xl shadow-xl transition-all duration-300 transform hover:scale-[1.02] ${botao.cor} text-white`}
          >
            <botao.icone size={48} className="mb-4" />
            <h2 className="text-3xl font-bold mb-2">{botao.titulo}</h2>
            <p className="text-gray-200">{botao.descricao}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}