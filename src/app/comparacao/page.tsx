'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Interfaces de Dados
interface SensorDataPoint {
    data: string;
    hora: string;
    tensao: number;
    corrente: number;
    potencia: number;
}

interface CombinedDataPoint {
    dataHora: string;
    tensao1?: number;
    corrente1?: number;
    potencia1?: number;
    tensao2?: number;
    corrente2?: number;
    potencia2?: number;
    tensao3?: number;
    corrente3?: number;
    potencia3?: number;
}

// Tipo de Chave de Série para garantir a segurança do TypeScript
type SeriesKey = 'tensao1' | 'corrente1' | 'potencia1' | 'tensao2' | 'corrente2' | 'potencia2' | 'tensao3' | 'corrente3' | 'potencia3';

// PROCESSAMENTO DE DADOS

const consolidateData = (data1: SensorDataPoint[], data2: SensorDataPoint[], data3: SensorDataPoint[]) => {
    const combinedMap = new Map<string, CombinedDataPoint>();

    const processData = (data: SensorDataPoint[], sensorId: number) => {
        data.forEach(p => {
            const key = p.data + ' ' + p.hora; 
            if (!combinedMap.has(key)) {
                combinedMap.set(key, { dataHora: p.hora });
            }
            const item = combinedMap.get(key)!;
            item[`tensao${sensorId}` as SeriesKey] = p.tensao;
            item[`corrente${sensorId}` as SeriesKey] = p.corrente;
            item[`potencia${sensorId}` as SeriesKey] = p.potencia;
        });
    };

    processData(data1, 1);
    processData(data2, 2);
    processData(data3, 3);

    return Array.from(combinedMap.values()).sort((a, b) => a.dataHora.localeCompare(b.dataHora));
};

const filterByGranularity = (data: CombinedDataPoint[], intervalMinutes: number) => {
    if (intervalMinutes <= 1 || data.length === 0) return data; 
    
    const filtered: CombinedDataPoint[] = [];
    let lastTime = new Date('2000/01/01 00:00:00').getTime(); 

    data.forEach((point, index) => {
        const [h, m, s] = point.dataHora.split(':').map(Number);
        const currentTime = new Date();
        
        currentTime.setHours(h, m, s, 0); 
        const timeStamp = currentTime.getTime();

        if (index === 0 || (timeStamp - lastTime) / 60000 >= intervalMinutes) {
             filtered.push(point);
             lastTime = timeStamp;
        }
    });

    if (data.length > 0 && !filtered.includes(data[data.length - 1])) {
         filtered.push(data[data.length - 1]);
    }

    return filtered;
};

// Gráfico
interface ChartProps {
    data: CombinedDataPoint[];
    dataType: 'tensao' | 'corrente' | 'potencia';
    activeSeries: { [K in SeriesKey]: boolean };
}

const ComparisonChart = ({ data, dataType, activeSeries }: ChartProps) => {
    
    const getUnitAndDomain = (type: typeof dataType) => {
        switch (type) {
            case 'tensao': return { unit: 'V', color: ['#3b82f6', '#10b981', '#f59e0b'] };
            case 'corrente': return { unit: 'A', color: ['#3b82f6', '#10b981', '#f59e0b'] };
            case 'potencia': return { unit: 'W', color: ['#3b82f6', '#10b981', '#f59e0b'] };
            default: return { unit: '', color: ['#3b82f6', '#10b981', '#f59e0b'] };
        }
    };

    const { unit, color } = getUnitAndDomain(dataType);
    
    const renderYLabel = () => {
        const name = dataType.charAt(0).toUpperCase() + dataType.slice(1);
        return { value: `${name} (${unit})`, angle: -90, position: 'insideLeft', fill: '#666' };
    };

    const lines = [1, 2, 3].map(i => ({
        key: `${dataType}${i}` as SeriesKey,
        name: `Sensor ${i}`,
        dataKey: `${dataType}${i}` as keyof CombinedDataPoint,
        color: color[i - 1],
        unit: unit,
        yAxisId: 'main'
    }));
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="p-3 bg-white border border-gray-300 shadow-lg rounded-md text-sm">
                    <p className="font-bold text-gray-700 mb-1">Hora: {label}</p>
                    {payload.map((p: any, index: number) => 
                        p.stroke !== 'transparent' && (
                            <p key={index} style={{ color: p.color }}>
                                {`${p.name}: ${p.value?.toFixed(2) ?? '---'} ${p.unit}`}
                            </p>
                        )
                    )}
                </div>
            );
        }
        return null;
    };


    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                
                <XAxis dataKey="dataHora" tickFormatter={(tick: string) => tick.split(':').slice(0, 2).join(':')} />
                
                <YAxis yAxisId="main" orientation="left" label={renderYLabel()} stroke="#666" />
                
                <Tooltip content={CustomTooltip} />
                
                {lines.map(line => {
                    const isActive = activeSeries[line.key];
                    
                    return (
                        <Line 
                            key={line.key}
                            yAxisId={line.yAxisId}
                            type="monotone" 
                            dataKey={line.dataKey} 
                            stroke={isActive ? line.color : "transparent"} 
                            strokeWidth={isActive ? 2 : 0} 
                            name={line.name} 
                            unit={line.unit}
                            dot={false}
                        />
                    );
                })}
            </LineChart>
        </ResponsiveContainer>
    );
};

// Principal 

export default function ComparacaoPage() {
    const router = useRouter();
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rawData, setRawData] = useState<{ sensor1: SensorDataPoint[], sensor2: SensorDataPoint[], sensor3: SensorDataPoint[] }>({ sensor1: [], sensor2: [], sensor3: [] });
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [granularity, setGranularity] = useState(5); 
    
    const [activeSeries, setActiveSeries] = useState<{[K in SeriesKey]: boolean}>({
        tensao1: true, corrente1: false, potencia1: false,
        tensao2: false, corrente2: false, potencia2: false,
        tensao3: false, corrente3: false, potencia3: false,
    });
    
    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            setError(null);
            
            const fetchSensor = (id: number) => 
                fetch(`/api/sensordata?id=${id}&all_history=true`)
                .then(res => {
                    if (!res.ok) throw new Error(`Status ${res.status}`);
                    return res.json();
                })
                .then(data => data.historico || []);

            try {
                const [data1, data2, data3] = await Promise.all([
                    fetchSensor(1),
                    fetchSensor(2),
                    fetchSensor(3),
                ]);

                setRawData({ sensor1: data1, sensor2: data2, sensor3: data3 });
                
                if (data1.length > 0) {
                    const lastDate = data1[data1.length - 1].data;
                    setStartDate(lastDate);
                    setEndDate(lastDate);
                }

            } catch (err) {
                console.error("Erro ao buscar dados dos sensores:", err);
                setError("Falha ao carregar dados. Verifique o backend.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const filteredData = useMemo(() => {
        if (!startDate || !endDate) return [];
        
        const start = startDate.replace(/-/g, ''); 
        const end = endDate.replace(/-/g, '');

        const filterRange = (data: SensorDataPoint[]) => 
            data.filter(p => {
                const dateKey = p.data.replace(/-/g, '');
                return dateKey >= start && dateKey <= end;
            });

        const filtered1 = filterRange(rawData.sensor1);
        const filtered2 = filterRange(rawData.sensor2);
        const filtered3 = filterRange(rawData.sensor3);

        return consolidateData(filtered1, filtered2, filtered3);

    }, [rawData, startDate, endDate]);

    const tableData = useMemo(() => {
        return filterByGranularity(filteredData, granularity);
    }, [filteredData, granularity]);

    const seriesConfig = [
        { label: 'Tensão', type: 'tensao' as 'tensao', color: '#3b82f6', sensors: [1, 2, 3] },
        { label: 'Corrente', type: 'corrente' as 'corrente', color: '#10b981', sensors: [1, 2, 3] },
        { label: 'Potência', type: 'potencia' as 'potencia', color: '#f59e0b', sensors: [1, 2, 3] },
    ];
    
    const tableColumns = useMemo(() => {
        const base = [{ label: 'Data/Hora', key: 'dataHora' as keyof CombinedDataPoint }];
        
        seriesConfig.forEach(s => {
            s.sensors.forEach(i => {
                const key = `${s.type}${i}` as SeriesKey;
                if (activeSeries[key]) {
                    base.push({ label: `${s.label} S${i}`, key: key as keyof CombinedDataPoint });
                }
            });
        });

        return base;
    }, [activeSeries]);

    
    const handleToggleSeries = (key: SeriesKey) => {
        setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <main className="flex flex-col items-center min-h-screen bg-gray-100 p-8 relative">
            <div className="w-full max-w-7xl bg-white rounded-xl shadow-2xl p-8">
                
                {/* Botão de Retorno */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-4 left-4 lg:top-8 lg:left-8 flex items-center px-4 py-2 text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors shadow-lg text-sm font-semibold z-10"
                >
                    <ArrowLeft size={18} className="mr-2" />
                    Voltar
                </button>

                <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-10 mt-4">
                    Análise e Comparação de Desempenho
                </h1>
                
                {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4 font-medium">{error}</p>}

                {/* FILTROS DE DATA E SÉRIES */}
                <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
                    <h2 className="text-xl font-bold text-gray-700 mb-4">Filtros de Visualização</h2>
                    
                    {/* Filtro de Data */}
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <label className="block">
                            <span className="text-gray-800">Data Inicial:</span>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-gray-500" 
                            />
                        </label>
                        <label className="block">
                            <span className="text-gray-800">Data Final:</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 text-gray-500" 
                            />
                        </label>
                        <p className="text-sm text-gray-500">
                            Pontos de dados no intervalo: {filteredData.length}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2 text-gray-800">Seleção de Curvas:</h3>
                        {seriesConfig.map((s, sIndex) => (
                            <div key={sIndex} className="flex flex-wrap items-center gap-6">
                                <span className={`font-bold w-20 text-lg`} style={{ color: s.color }}>{s.label}</span>
                                {s.sensors.map(i => {
                                    const key = `${s.type}${i}` as SeriesKey;
                                    const isActive = activeSeries[key];
                                    return (
                                        <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={() => handleToggleSeries(key)}
                                                className={`form-checkbox h-5 w-5 rounded`}
                                                style={{ accentColor: s.color }}
                                            />
                                            <span className="text-gray-800">Sensor {i}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/*GRÁFICOS*/}
                <div className="space-y-12">
                    {isLoading ? (
                         <div className="text-center py-20 text-gray-500">
                            <Loader2 className="animate-spin inline mr-2" size={24} />
                            Carregando histórico completo dos 3 sensores...
                         </div>
                    ) : (
                        seriesConfig.map(s => (
                            <div key={s.type}>
                                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">{s.label} - Gráfico Comparativo</h2>
                                <ComparisonChart 
                                    data={filteredData} 
                                    dataType={s.type} 
                                    activeSeries={activeSeries} 
                                />
                            </div>
                        ))
                    )}
                </div>

                {/*TABELA DE DADOS*/}
                <div className="mt-16 pt-8 border-t">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4">Tabela de Dados</h2>
                    
                    {/* Filtro de Granularidade */}
                    <div className="mb-4 flex items-center gap-4">
                        <label className="text-gray-800">Mostrar dados a cada:</label>
                        <select 
                            value={granularity} 
                            onChange={e => setGranularity(Number(e.target.value))}
                            className="p-2 border rounded-md shadow-sm text-gray-500"
                        >
                            <option value={5}>5 minutos</option>
                            <option value={15}>15 minutos</option>
                            <option value={30}>30 minutos</option>
                            <option value={60}>1 hora</option>
                            <option value={180}>3 horas</option>
                            <option value={300}>5 horas</option>
                        </select>
                        <span className="text-sm text-gray-500">({tableData.length} linhas filtradas)</span>
                    </div>

                    {/* Tabela */}
                    <div className="overflow-x-auto bg-gray-50 rounded-lg shadow-md max-h-96">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-200 sticky top-0">
                                <tr>
                                    {tableColumns.map(col => (
                                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tableData.map((row, index) => (
                                    <tr key={index}>
                                        {tableColumns.map(col => (
                                            <td key={col.key} className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                                {col.key === 'dataHora' 
                                                    ? row.dataHora 
                                                    : (row[col.key] as number)?.toFixed(2) ?? '---'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {tableData.length === 0 && !isLoading && (
                            <p className="text-center py-4 text-gray-500">Nenhum dado encontrado para os filtros selecionados.</p>
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}