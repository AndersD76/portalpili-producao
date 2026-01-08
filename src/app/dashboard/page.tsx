'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AtividadeStats {
  atividade: string;
  total: number;
  concluidas: number;
  em_andamento: number;
  a_realizar: number;
  tempo_medio_minutos: number | null;
  ordem: number;
}

interface OPDStats {
  total_opds: number;
  total_atividades: number;
  atividades_concluidas: number;
  atividades_em_andamento: number;
  atividades_a_realizar: number;
  percentual_conclusao: number;
}

interface Filtros {
  opds: string[];
  atividades: string[];
  produtos: string[];
}

const COLORS = {
  concluidas: '#10b981',
  em_andamento: '#f59e0b',
  a_realizar: '#6b7280',
  primary: '#dc2626',
};

// Formatar tempo em minutos para exibição legível
function formatarTempo(minutos: number | null): string {
  if (minutos === null || minutos === 0) return 'N/A';

  if (minutos < 60) {
    return `${Math.round(minutos)} min`;
  } else if (minutos < 1440) { // menos de 1 dia
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  } else {
    const dias = Math.floor(minutos / 1440);
    const horasRestantes = Math.floor((minutos % 1440) / 60);
    return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
  }
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [opdStats, setOpdStats] = useState<OPDStats | null>(null);
  const [atividadeStats, setAtividadeStats] = useState<AtividadeStats[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({ opds: [], atividades: [], produtos: [] });
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Estados dos filtros
  const [filtroOPD, setFiltroOPD] = useState<string>('');
  const [filtroProduto, setFiltroProduto] = useState<string>('');
  const [filtroAtividade, setFiltroAtividade] = useState<string>('');

  // Verificar autenticação
  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    if (authenticated !== 'true') {
      router.push('/login');
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('user_data');
    sessionStorage.removeItem('politica_vista');
    router.push('/login');
  };

  const fetchDashboardData = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroOPD) params.append('opd', filtroOPD);
      if (filtroProduto) params.append('produto', filtroProduto);
      if (filtroAtividade) params.append('atividade', filtroAtividade);

      const url = `/api/dashboard${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();

      if (data.success) {
        setOpdStats(data.data.opdStats);
        setAtividadeStats(data.data.atividadeStats);
        setFiltros(data.data.filtros);
        setError(null);
      } else {
        setError('Erro ao carregar dados do dashboard');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checkingAuth) return;
    fetchDashboardData();
  }, [checkingAuth, filtroOPD, filtroProduto, filtroAtividade]);

  const limparFiltros = () => {
    setFiltroOPD('');
    setFiltroProduto('');
    setFiltroAtividade('');
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-600 text-xl font-bold mb-4">Erro</div>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchDashboardData();
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">SIG</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Sistema Integrado de Gestão</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchDashboardData();
                }}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Atualizar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Sair"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Title e Filtros */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Produção</h2>
          <p className="text-gray-600 text-sm mb-4">Análise e Métricas das OPDs</p>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={filtroOPD}
              onChange={(e) => setFiltroOPD(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="">Todas as OPDs</option>
              {filtros.opds.map((opd) => (
                <option key={opd} value={opd}>{opd}</option>
              ))}
            </select>

            <select
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="">Todos os Produtos</option>
              {filtros.produtos.map((produto) => (
                <option key={produto} value={produto}>{produto}</option>
              ))}
            </select>

            <select
              value={filtroAtividade}
              onChange={(e) => setFiltroAtividade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
            >
              <option value="">Todas as Atividades</option>
              {filtros.atividades.map((atividade) => (
                <option key={atividade} value={atividade}>{atividade}</option>
              ))}
            </select>

            {(filtroOPD || filtroProduto || filtroAtividade) && (
              <button
                onClick={limparFiltros}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resumo Geral */}
        {opdStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-600 mb-1">Total de OPDs</p>
              <p className="text-2xl font-bold text-gray-900">{opdStats.total_opds}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-600 mb-1">Total de Atividades</p>
              <p className="text-2xl font-bold text-gray-900">{opdStats.total_atividades}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-600 mb-1">Concluídas</p>
              <p className="text-2xl font-bold text-green-600">{opdStats.atividades_concluidas}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-600 mb-1">Em Andamento</p>
              <p className="text-2xl font-bold text-yellow-600">{opdStats.atividades_em_andamento}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-600 mb-1">A Realizar</p>
              <p className="text-2xl font-bold text-gray-600">{opdStats.atividades_a_realizar}</p>
            </div>
          </div>
        )}

        {/* Percentual de Conclusão */}
        {opdStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">Progresso Geral</h2>
              <span className="text-2xl font-bold text-green-600">{opdStats.percentual_conclusao.toFixed(1)}%</span>
            </div>
            <div className="overflow-hidden h-4 rounded-full bg-gray-200">
              <div
                style={{ width: `${opdStats.percentual_conclusao}%` }}
                className="h-full bg-green-500 transition-all duration-500"
              ></div>
            </div>
          </div>
        )}

        {/* Gráficos - 2 colunas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Pizza */}
          {opdStats && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Concluídas', value: opdStats.atividades_concluidas, color: COLORS.concluidas },
                      { name: 'Em Andamento', value: opdStats.atividades_em_andamento, color: COLORS.em_andamento },
                      { name: 'A Realizar', value: opdStats.atividades_a_realizar, color: COLORS.a_realizar },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    <Cell fill={COLORS.concluidas} />
                    <Cell fill={COLORS.em_andamento} />
                    <Cell fill={COLORS.a_realizar} />
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico de Tempo Médio - Top 10 */}
          {atividadeStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 - Maior Tempo Médio</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={atividadeStats
                    .filter(stat => stat.tempo_medio_minutos !== null && stat.tempo_medio_minutos > 0)
                    .sort((a, b) => (b.tempo_medio_minutos || 0) - (a.tempo_medio_minutos || 0))
                    .slice(0, 10)
                    .map(stat => ({
                      nome: stat.atividade.length > 15 ? stat.atividade.substring(0, 15) + '...' : stat.atividade,
                      nomeCompleto: stat.atividade,
                      minutos: stat.tempo_medio_minutos,
                      tempoFormatado: formatarTempo(stat.tempo_medio_minutos),
                    }))
                  }
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name, props) => [props.payload.tempoFormatado, props.payload.nomeCompleto]}
                    labelFormatter={() => ''}
                  />
                  <Bar dataKey="minutos" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Gráfico de Barras - Status por Atividade (ordenado) */}
        {atividadeStats.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Status por Atividade (Ordem de Execução)</h3>
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(600, atividadeStats.length * 50) }}>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={atividadeStats.map((stat, index) => ({
                      ...stat,
                      atividadeCurta: `${index + 1}. ${stat.atividade.length > 12 ? stat.atividade.substring(0, 12) + '...' : stat.atividade}`
                    }))}
                    margin={{ top: 20, right: 20, left: 10, bottom: 120 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="atividadeCurta"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 9 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(value, payload) => payload?.[0]?.payload?.atividade || value}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="concluidas" name="Concluídas" stackId="a" fill={COLORS.concluidas} />
                    <Bar dataKey="em_andamento" name="Em Andamento" stackId="a" fill={COLORS.em_andamento} />
                    <Bar dataKey="a_realizar" name="A Realizar" stackId="a" fill={COLORS.a_realizar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Estatísticas por Atividade */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Estatísticas por Atividade</h2>
            <p className="text-sm text-gray-500">Ordenado por sequência de execução</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atividade
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Concluídas
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Em Andamento
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    A Realizar
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tempo Médio
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progresso
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {atividadeStats.map((stat, index) => {
                  const progresso = stat.total > 0 ? (stat.concluidas / stat.total) * 100 : 0;
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {stat.atividade}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center font-semibold">
                        {stat.total}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {stat.concluidas}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {stat.em_andamento}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {stat.a_realizar}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <span className={stat.tempo_medio_minutos ? 'font-semibold text-gray-900' : 'text-gray-400'}>
                          {formatarTempo(stat.tempo_medio_minutos)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${progresso}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 w-10 text-right">{progresso.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
