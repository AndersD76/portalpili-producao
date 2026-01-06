'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardData {
  naoConformidades: {
    stats: {
      total: number;
      abertas: number;
      em_analise: number;
      fechadas: number;
      total_itens: number;
    };
    porTipo: Array<{ tipo: string; count: number }>;
    porGravidade: Array<{ gravidade: string; count: number }>;
    porDisposicao: Array<{ disposicao: string; count: number }>;
    porSetor: Array<{ setor: string; count: number }>;
    porLocal: Array<{ local: string; count: number }>;
    porMes: Array<{ mes: string; count: number }>;
    porOrigem: Array<{ origem: string; count: number }>;
    topDetectores: Array<{ responsavel: string; count: number }>;
    recentes: Array<{
      id: number;
      numero: string;
      tipo: string;
      gravidade: string;
      status: string;
      descricao: string;
      data_ocorrencia: string;
      local_ocorrencia: string;
    }>;
  };
  reclamacoes: {
    stats: {
      total: number;
      abertas: number;
      em_analise: number;
      fechadas: number;
    };
  };
  acoesCorretivas: {
    stats: {
      total: number;
      abertas: number;
      em_andamento: number;
      fechadas: number;
      eficazes: number;
    };
  };
}

// Componente de Gráfico de Pizza simples
function PieChart({ data, colors }: { data: Array<{ label: string; value: number }>; colors: string[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="text-center text-gray-500 py-8">Sem dados</div>;

  let cumulativePercent = 0;
  const slices = data.map((item, index) => {
    const percent = (item.value / total) * 100;
    const startAngle = cumulativePercent * 3.6;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 3.6;
    return { ...item, percent, startAngle, endAngle, color: colors[index % colors.length] };
  });

  // Criar gradientes cônicos para o gráfico
  const gradientStops = slices.map((slice, index) => {
    const start = index === 0 ? 0 : slices.slice(0, index).reduce((sum, s) => sum + s.percent, 0);
    return `${slice.color} ${start}% ${start + slice.percent}%`;
  }).join(', ');

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-40 h-40 rounded-full mb-4"
        style={{
          background: `conic-gradient(${gradientStops})`,
        }}
      />
      <div className="flex flex-wrap justify-center gap-2">
        {slices.filter(s => s.percent >= 2).map((slice, index) => (
          <div key={index} className="flex items-center text-xs">
            <span
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-gray-600">{slice.label}: {slice.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente de Gráfico de Barras Horizontal
function HorizontalBarChart({
  data,
  color = 'bg-blue-500',
  showPercentage = false,
  total = 0
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  showPercentage?: boolean;
  total?: number;
}) {
  const max = Math.max(...data.map(d => d.value));
  if (max === 0) return <div className="text-center text-gray-500 py-4">Sem dados</div>;

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index}>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-700 truncate flex-1 mr-2">{item.label}</span>
            <span className="text-xs font-bold text-gray-900">
              {item.value.toLocaleString('pt-BR')}
              {showPercentage && total > 0 && (
                <span className="text-gray-500 ml-1">({((item.value / total) * 100).toFixed(1)}%)</span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${color}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function QualidadeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'processos' | 'tipos' | 'ncs'>('overview');
  const router = useRouter();

  // Filtros
  const [filtroLocal, setFiltroLocal] = useState<string>('todos');
  const [filtroGravidade, setFiltroGravidade] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroProcesso, setFiltroProcesso] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');

  useEffect(() => {
    const authenticated = localStorage.getItem('authenticated');
    const userData = localStorage.getItem('user_data');

    if (authenticated !== 'true' || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (e) {
      router.push('/login');
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/qualidade/dashboard');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('authenticated');
      localStorage.removeItem('user_data');
      router.push('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  const limparFiltros = () => {
    setFiltroLocal('todos');
    setFiltroGravidade('todos');
    setFiltroStatus('todos');
    setFiltroTipo('todos');
    setFiltroProcesso('todos');
    setFiltroPeriodo('todos');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatNumber = (num: number | string | null) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('pt-BR');
  };

  const getGravidadeColor = (gravidade: string) => {
    const g = gravidade?.toUpperCase();
    if (g === 'ALTA') return 'bg-red-500';
    if (g === 'MEDIA' || g === 'MÉDIA') return 'bg-yellow-500';
    if (g === 'BAIXA') return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANALISE': 'bg-yellow-100 text-yellow-800',
      'FECHADA': 'bg-gray-100 text-gray-800'
    };
    const statusLabels: Record<string, string> = {
      'ABERTA': 'Aberta',
      'EM_ANALISE': 'Em Análise',
      'FECHADA': 'Fechada'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  // Cores para gráficos
  const pieColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  const disposicaoColors = ['#8B5CF6', '#6366F1', '#EC4899', '#06B6D4', '#14B8A6'];

  // Calcular estatísticas filtradas
  const filtrosAtivos = filtroLocal !== 'todos' || filtroGravidade !== 'todos' ||
    filtroStatus !== 'todos' || filtroTipo !== 'todos' || filtroProcesso !== 'todos';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const ncStats = data.naoConformidades.stats;
  const recStats = data.reclamacoes.stats;
  const acStats = data.acoesCorretivas.stats;

  // Dados para gráficos de pizza
  const statusPieData = [
    { label: 'Fechadas', value: Number(ncStats.fechadas) },
    { label: 'Abertas', value: Number(ncStats.abertas) },
    { label: 'Em Análise', value: Number(ncStats.em_analise) },
  ].filter(d => d.value > 0);

  const gravidadePieData = data.naoConformidades.porGravidade.map(g => ({
    label: g.gravidade || 'N/D',
    value: Number(g.count)
  }));

  const disposicaoPieData = data.naoConformidades.porDisposicao.map(d => ({
    label: d.disposicao || 'N/D',
    value: Number(d.count)
  }));

  const localPieData = data.naoConformidades.porLocal.slice(0, 6).map(l => ({
    label: l.local,
    value: Number(l.count)
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link
                href="/qualidade"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition mt-1"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard de Qualidade</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">Indicadores e estatísticas do sistema de qualidade</p>
                {user && (
                  <div className="flex items-center mt-2 text-xs sm:text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">{user.nome}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link
                href="/qualidade/nao-conformidade"
                className="flex-1 sm:flex-none px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-center text-sm"
              >
                NCs
              </Link>
              <Link
                href="/qualidade"
                className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center text-sm"
              >
                Qualidade
              </Link>
              <Link
                href="/"
                className="flex-1 sm:flex-none px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-center text-sm"
              >
                Módulos
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center space-x-2 text-sm"
                title="Sair do sistema"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cards Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total NCs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(ncStats.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(ncStats.total_itens)} itens afetados</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">NCs Abertas</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">{formatNumber(ncStats.abertas)}</p>
                <p className="text-xs text-gray-500 mt-1">{ncStats.total > 0 ? ((Number(ncStats.abertas) / Number(ncStats.total)) * 100).toFixed(1) : 0}% do total</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Reclamações</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(recStats.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(recStats.abertas)} abertas</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Ações Corretivas</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(acStats.total)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(acStats.eficazes)} eficazes</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
            </h3>
            {filtrosAtivos && (
              <button
                onClick={limparFiltros}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unidade (UF)</label>
              <select
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todas</option>
                {data.naoConformidades.porLocal.map((item, i) => (
                  <option key={i} value={item.local}>{item.local}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gravidade</label>
              <select
                value={filtroGravidade}
                onChange={(e) => setFiltroGravidade(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todas</option>
                {data.naoConformidades.porGravidade.map((item, i) => (
                  <option key={i} value={item.gravidade}>{item.gravidade}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                <option value="ABERTA">Aberta</option>
                <option value="EM_ANALISE">Em Análise</option>
                <option value="FECHADA">Fechada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                {data.naoConformidades.porTipo.map((item, i) => (
                  <option key={i} value={item.tipo}>{item.tipo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Processo</label>
              <select
                value={filtroProcesso}
                onChange={(e) => setFiltroProcesso(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todos</option>
                {data.naoConformidades.porSetor.map((item, i) => (
                  <option key={i} value={item.setor}>{item.setor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todos">Todo período</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="180">Últimos 6 meses</option>
                <option value="365">Último ano</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setViewMode('processos')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'processos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Processo
            </button>
            <button
              onClick={() => setViewMode('tipos')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'tipos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Por Tipo
            </button>
            <button
              onClick={() => setViewMode('ncs')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'ncs' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              NCs Recentes
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            {/* Gráficos de Pizza */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-4 text-center">STATUS</h3>
                <PieChart data={statusPieData} colors={['#6B7280', '#EF4444', '#F59E0B']} />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-4 text-center">GRAVIDADE</h3>
                <PieChart data={gravidadePieData} colors={['#10B981', '#F59E0B', '#EF4444', '#6B7280']} />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-4 text-center">DISPOSIÇÃO</h3>
                <PieChart data={disposicaoPieData} colors={disposicaoColors} />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-4 text-center">UNIDADE FAB.</h3>
                <PieChart data={localPieData} colors={pieColors} />
              </div>
            </div>

            {/* Gráficos de Barras */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Tipos de NC</h3>
                <HorizontalBarChart
                  data={data.naoConformidades.porTipo.map(t => ({ label: t.tipo, value: Number(t.count) }))}
                  color="bg-red-500"
                  showPercentage
                  total={Number(ncStats.total)}
                />
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Processo de Origem</h3>
                <HorizontalBarChart
                  data={data.naoConformidades.porSetor.map(s => ({ label: s.setor, value: Number(s.count) }))}
                  color="bg-orange-500"
                  showPercentage
                  total={Number(ncStats.total)}
                />
              </div>
            </div>

            {/* Gráfico de Evolução Mensal */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Evolução Mensal de NCs</h3>
              <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
                {data.naoConformidades.porMes.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porMes.map(i => Number(i.count)));
                  const height = max > 0 ? (Number(item.count) / max) * 100 : 0;
                  const [year, month] = item.mes.split('-');
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  return (
                    <div key={index} className="flex flex-col items-center min-w-[50px]">
                      <span className="text-xs font-bold text-gray-900 mb-1">{item.count}</span>
                      <div
                        className="w-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition cursor-pointer"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${monthNames[parseInt(month) - 1]}/${year}: ${item.count} NCs`}
                      />
                      <span className="text-xs text-gray-600 mt-1">{monthNames[parseInt(month) - 1]}</span>
                      <span className="text-xs text-gray-400">{year.slice(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'processos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Processo de Origem</h3>
              <HorizontalBarChart
                data={data.naoConformidades.porSetor.map(s => ({ label: s.setor, value: Number(s.count) }))}
                color="bg-orange-500"
                showPercentage
                total={Number(ncStats.total)}
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Tarefa de Origem</h3>
              <HorizontalBarChart
                data={data.naoConformidades.porOrigem.map(o => ({ label: o.origem, value: Number(o.count) }))}
                color="bg-green-500"
                showPercentage
                total={Number(ncStats.total)}
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Unidade de Fabricação</h3>
              <HorizontalBarChart
                data={data.naoConformidades.porLocal.map(l => ({ label: l.local, value: Number(l.count) }))}
                color="bg-blue-500"
                showPercentage
                total={Number(ncStats.total)}
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Detectores</h3>
              <HorizontalBarChart
                data={data.naoConformidades.topDetectores.map(d => ({ label: d.responsavel, value: Number(d.count) }))}
                color="bg-indigo-500"
                showPercentage
                total={Number(ncStats.total)}
              />
            </div>
          </div>
        )}

        {viewMode === 'tipos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Tipos de NC</h3>
              <HorizontalBarChart
                data={data.naoConformidades.porTipo.map(t => ({ label: t.tipo, value: Number(t.count) }))}
                color="bg-red-500"
                showPercentage
                total={Number(ncStats.total)}
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Gravidade</h3>
              <HorizontalBarChart
                data={data.naoConformidades.porGravidade.map(g => ({ label: g.gravidade || 'N/D', value: Number(g.count) }))}
                color="bg-yellow-500"
                showPercentage
                total={Number(ncStats.total)}
              />
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Disposição</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <HorizontalBarChart
                  data={data.naoConformidades.porDisposicao.map(d => ({ label: d.disposicao || 'N/D', value: Number(d.count) }))}
                  color="bg-purple-500"
                  showPercentage
                  total={Number(ncStats.total)}
                />
                <div className="flex items-center justify-center">
                  <PieChart data={disposicaoPieData} colors={disposicaoColors} />
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'ncs' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Não Conformidades Recentes</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Número</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Data</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Local</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tipo</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gravidade</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.naoConformidades.recentes.map((nc) => (
                    <tr key={nc.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <Link
                          href={`/qualidade/nao-conformidade/${nc.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {nc.numero}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">{formatDate(nc.data_ocorrencia)}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{nc.local_ocorrencia || '-'}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{nc.tipo || '-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`w-3 h-3 rounded-full inline-block ${getGravidadeColor(nc.gravidade)}`}></span>
                        <span className="ml-2 text-sm">{nc.gravidade || '-'}</span>
                      </td>
                      <td className="px-3 py-3">{getStatusBadge(nc.status)}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-xs truncate">{nc.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <Link
                href="/qualidade/nao-conformidade"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver todas as Não Conformidades
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
