'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

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
      respondidas: number;
      fechadas: number;
    };
    porStatus: Array<{ status: string; count: number }>;
    porMes: Array<{ mes: string; count: number }>;
    porTipoDefeito: Array<{ tipo: string; count: number }>;
    recentes: Array<{
      id: number;
      numero: string;
      cliente_nome: string;
      status: string;
      descricao: string;
      data_reclamacao: string;
      tipo_reclamacao: string;
    }>;
  };
  acoesCorretivas: {
    stats: {
      total: number;
      abertas: number;
      em_andamento: number;
      aguardando_verificacao: number;
      fechadas: number;
    };
    porStatus: Array<{ status: string; count: number }>;
    porMes: Array<{ mes: string; count: number }>;
    porOrigem: Array<{ origem: string; count: number }>;
    recentes: Array<{
      id: number;
      numero: string;
      responsavel_principal: string;
      status: string;
      descricao_problema: string;
      data_abertura: string;
      prazo_conclusao: string;
    }>;
    vencidas: number;
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

  const gradientStops = slices.map((slice, index) => {
    const start = index === 0 ? 0 : slices.slice(0, index).reduce((sum, s) => sum + s.percent, 0);
    return `${slice.color} ${start}% ${start + slice.percent}%`;
  }).join(', ');

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-36 h-36 rounded-full mb-3"
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
      {data.slice(0, 8).map((item, index) => (
        <div key={index}>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-700 truncate flex-1 mr-2">{item.label || 'N/D'}</span>
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

// Componente de Gráfico de Barras Vertical (Evolução Mensal)
function MonthlyBarChart({ data, color = 'blue' }: { data: Array<{ mes: string; count: number }>; color?: string }) {
  if (!data || data.length === 0) return <div className="text-center text-gray-500 py-4">Sem dados</div>;

  const max = Math.max(...data.map(i => Number(i.count)));
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const colorClasses: Record<string, string> = {
    blue: 'from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500',
    orange: 'from-orange-600 to-orange-400 hover:from-orange-700 hover:to-orange-500',
    green: 'from-green-600 to-green-400 hover:from-green-700 hover:to-green-500',
  };

  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
      {data.map((item, index) => {
        const height = max > 0 ? (Number(item.count) / max) * 100 : 0;
        const [year, month] = item.mes.split('-');
        return (
          <div key={index} className="flex flex-col items-center min-w-[40px]">
            <span className="text-xs font-bold text-gray-900 mb-1">{item.count}</span>
            <div
              className={`w-6 bg-gradient-to-t ${colorClasses[color]} rounded-t transition cursor-pointer`}
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${monthNames[parseInt(month) - 1]}/${year}: ${item.count}`}
            />
            <span className="text-xs text-gray-600 mt-1">{monthNames[parseInt(month) - 1]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function QualidadeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'ncs' | 'reclamacoes' | 'acoes'>('ncs');
  const router = useRouter();
  const { user, authenticated, loading: authLoading, logout } = useAuth();

  // Filtros
  const [filtroLocal, setFiltroLocal] = useState<string>('todos');
  const [filtroGravidade, setFiltroGravidade] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroProcesso, setFiltroProcesso] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [authLoading, authenticated]);

  // Refetch quando os filtros mudam
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [filtroLocal, filtroGravidade, filtroStatus, filtroTipo, filtroProcesso, filtroPeriodo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroLocal !== 'todos') params.append('local', filtroLocal);
      if (filtroGravidade !== 'todos') params.append('gravidade', filtroGravidade);
      if (filtroStatus !== 'todos') params.append('status', filtroStatus);
      if (filtroTipo !== 'todos') params.append('tipo', filtroTipo);
      if (filtroProcesso !== 'todos') params.append('processo', filtroProcesso);
      if (filtroPeriodo !== 'todos') params.append('periodo', filtroPeriodo);

      const url = `/api/qualidade/dashboard${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
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

  const handleLogout = () => {
    logout();
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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANALISE': 'bg-yellow-100 text-yellow-800',
      'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
      'AGUARDANDO_VERIFICACAO': 'bg-purple-100 text-purple-800',
      'RESPONDIDA': 'bg-green-100 text-green-800',
      'FECHADA': 'bg-gray-100 text-gray-800'
    };
    const statusLabels: Record<string, string> = {
      'ABERTA': 'Aberta',
      'EM_ANALISE': 'Em Análise',
      'EM_ANDAMENTO': 'Em Andamento',
      'AGUARDANDO_VERIFICACAO': 'Aguard. Verif.',
      'RESPONDIDA': 'Respondida',
      'FECHADA': 'Fechada'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const pieColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  const filtrosAtivos = filtroLocal !== 'todos' || filtroGravidade !== 'todos' ||
    filtroStatus !== 'todos' || filtroTipo !== 'todos' || filtroProcesso !== 'todos' || filtroPeriodo !== 'todos';

  if (loading && !data) {
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
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard de Qualidade</h1>
                <p className="text-gray-600 text-sm">Indicadores e estatísticas do sistema</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* Cards Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
            <p className="text-xs text-gray-600">Total NCs</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(ncStats.total)}</p>
            <p className="text-xs text-red-600">{formatNumber(ncStats.abertas)} abertas</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
            <p className="text-xs text-gray-600">Reclamações</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(recStats.total)}</p>
            <p className="text-xs text-orange-600">{formatNumber(recStats.abertas)} abertas</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
            <p className="text-xs text-gray-600">Ações Corretivas</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(acStats.total)}</p>
            <p className="text-xs text-green-600">{formatNumber(acStats.fechadas)} fechadas</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
            <p className="text-xs text-gray-600">RACs Vencidas</p>
            <p className="text-2xl font-bold text-yellow-600">{formatNumber(data.acoesCorretivas.vencidas)}</p>
            <p className="text-xs text-gray-500">prazo expirado</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros (NCs)
            </h3>
            {filtrosAtivos && (
              <button onClick={limparFiltros} className="text-sm text-blue-600 hover:text-blue-800">
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Unidade</label>
              <select
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">Todo período</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="180">Últimos 6 meses</option>
                <option value="365">Último ano</option>
              </select>
            </div>
          </div>
          {loading && (
            <div className="mt-2 text-sm text-blue-600">Atualizando dados...</div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('ncs')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'ncs' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Não Conformidades
            </button>
            <button
              onClick={() => setViewMode('reclamacoes')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'reclamacoes' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reclamações de Clientes
            </button>
            <button
              onClick={() => setViewMode('acoes')}
              className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'acoes' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Ações Corretivas
            </button>
          </div>
        </div>

        {/* Conteúdo - Não Conformidades */}
        {viewMode === 'ncs' && (
          <div className="space-y-6">
            {/* Gráficos de Pizza */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">STATUS</h3>
                <PieChart
                  data={[
                    { label: 'Fechadas', value: Number(ncStats.fechadas) },
                    { label: 'Abertas', value: Number(ncStats.abertas) },
                    { label: 'Em Análise', value: Number(ncStats.em_analise) },
                  ].filter(d => d.value > 0)}
                  colors={['#6B7280', '#EF4444', '#F59E0B']}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">GRAVIDADE</h3>
                <PieChart
                  data={data.naoConformidades.porGravidade.map(g => ({ label: g.gravidade || 'N/D', value: Number(g.count) }))}
                  colors={['#10B981', '#F59E0B', '#EF4444', '#6B7280']}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">DISPOSIÇÃO</h3>
                <PieChart
                  data={data.naoConformidades.porDisposicao.map(d => ({ label: d.disposicao || 'N/D', value: Number(d.count) }))}
                  colors={['#8B5CF6', '#6366F1', '#EC4899', '#06B6D4', '#14B8A6']}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">UNIDADE FAB.</h3>
                <PieChart
                  data={data.naoConformidades.porLocal.slice(0, 6).map(l => ({ label: l.local, value: Number(l.count) }))}
                  colors={pieColors}
                />
              </div>
            </div>

            {/* Gráficos de Barras */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Top Tipos de NC</h3>
                <HorizontalBarChart
                  data={data.naoConformidades.porTipo.map(t => ({ label: t.tipo, value: Number(t.count) }))}
                  color="bg-red-500"
                  showPercentage
                  total={Number(ncStats.total)}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">NCs por Processo</h3>
                <HorizontalBarChart
                  data={data.naoConformidades.porSetor.map(s => ({ label: s.setor, value: Number(s.count) }))}
                  color="bg-orange-500"
                  showPercentage
                  total={Number(ncStats.total)}
                />
              </div>
            </div>

            {/* Evolução Mensal */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Evolução Mensal de NCs</h3>
              <MonthlyBarChart data={data.naoConformidades.porMes} color="blue" />
            </div>
          </div>
        )}

        {/* Conteúdo - Reclamações de Clientes */}
        {viewMode === 'reclamacoes' && (
          <div className="space-y-6">
            {/* Cards de Status */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatNumber(recStats.total)}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{formatNumber(recStats.abertas)}</p>
                <p className="text-xs text-gray-600">Abertas</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{formatNumber(recStats.em_analise)}</p>
                <p className="text-xs text-gray-600">Em Análise</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{formatNumber(recStats.respondidas)}</p>
                <p className="text-xs text-gray-600">Respondidas</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{formatNumber(recStats.fechadas)}</p>
                <p className="text-xs text-gray-600">Fechadas</p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">Status das Reclamações</h3>
                <PieChart
                  data={data.reclamacoes.porStatus.map(s => ({
                    label: s.status === 'ABERTA' ? 'Aberta' : s.status === 'EM_ANALISE' ? 'Em Análise' : s.status === 'RESPONDIDA' ? 'Respondida' : 'Fechada',
                    value: Number(s.count)
                  }))}
                  colors={['#EF4444', '#F59E0B', '#3B82F6', '#6B7280']}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Tipos de Defeito</h3>
                <HorizontalBarChart
                  data={data.reclamacoes.porTipoDefeito.map(t => ({ label: t.tipo || 'N/D', value: Number(t.count) }))}
                  color="bg-orange-500"
                  showPercentage
                  total={Number(recStats.total)}
                />
              </div>
            </div>

            {/* Evolução Mensal */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Evolução Mensal de Reclamações</h3>
              <MonthlyBarChart data={data.reclamacoes.porMes} color="orange" />
            </div>

            {/* Reclamações Recentes */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Reclamações Recentes</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Número</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Cliente</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Tipo Defeito</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.reclamacoes.recentes.map(rec => (
                      <tr key={rec.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Link href={`/qualidade/reclamacao-cliente/${rec.id}`} className="text-orange-600 hover:text-orange-800 font-medium text-sm">
                            {rec.numero}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">{formatDate(rec.data_reclamacao)}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{rec.cliente_nome || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-600">{rec.tipo_reclamacao || '-'}</td>
                        <td className="px-3 py-2">{getStatusBadge(rec.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-center">
                <Link href="/qualidade/reclamacao-cliente" className="text-orange-600 hover:text-orange-800 text-sm font-medium">
                  Ver todas as Reclamações
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo - Ações Corretivas */}
        {viewMode === 'acoes' && (
          <div className="space-y-6">
            {/* Cards de Status */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatNumber(acStats.total)}</p>
                <p className="text-xs text-gray-600">Total</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{formatNumber(acStats.abertas)}</p>
                <p className="text-xs text-gray-600">Abertas</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{formatNumber(acStats.em_andamento)}</p>
                <p className="text-xs text-gray-600">Em Andamento</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-gray-600">{formatNumber(acStats.fechadas)}</p>
                <p className="text-xs text-gray-600">Fechadas</p>
              </div>
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{formatNumber(data.acoesCorretivas.vencidas)}</p>
                <p className="text-xs text-gray-600">Vencidas</p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 text-center">Status das Ações</h3>
                <PieChart
                  data={data.acoesCorretivas.porStatus.map(s => ({
                    label: s.status === 'ABERTA' ? 'Aberta' : s.status === 'EM_ANDAMENTO' ? 'Em Andamento' : s.status === 'AGUARDANDO_VERIFICACAO' ? 'Aguard. Verif.' : 'Fechada',
                    value: Number(s.count)
                  }))}
                  colors={['#EF4444', '#3B82F6', '#8B5CF6', '#6B7280']}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Origem das Ações</h3>
                <HorizontalBarChart
                  data={data.acoesCorretivas.porOrigem.map(o => ({
                    label: o.origem === 'NAO_CONFORMIDADE' ? 'Não Conformidade' : o.origem === 'RECLAMACAO' ? 'Reclamação' : o.origem || 'N/D',
                    value: Number(o.count)
                  }))}
                  color="bg-green-500"
                  showPercentage
                  total={Number(acStats.total)}
                />
              </div>
            </div>

            {/* Evolução Mensal */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Evolução Mensal de RACs</h3>
              <MonthlyBarChart data={data.acoesCorretivas.porMes} color="green" />
            </div>

            {/* Ações Recentes */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Ações Corretivas Recentes</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Número</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Data</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Responsável</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Problema</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Prazo</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.acoesCorretivas.recentes.map(ac => {
                      const prazoVencido = ac.prazo_conclusao && new Date(ac.prazo_conclusao) < new Date() && ac.status !== 'FECHADA';
                      return (
                        <tr key={ac.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Link href={`/qualidade/acao-corretiva/${ac.id}`} className="text-green-600 hover:text-green-800 font-medium text-sm">
                              {ac.numero}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">{formatDate(ac.data_abertura)}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{ac.responsavel_principal || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">{ac.descricao_problema || '-'}</td>
                          <td className={`px-3 py-2 text-sm ${prazoVencido ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                            {formatDate(ac.prazo_conclusao)}
                            {prazoVencido && ' !'}
                          </td>
                          <td className="px-3 py-2">{getStatusBadge(ac.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-center">
                <Link href="/qualidade/acao-corretiva" className="text-green-600 hover:text-green-800 text-sm font-medium">
                  Ver todas as Ações Corretivas
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
