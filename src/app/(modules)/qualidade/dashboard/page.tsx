'use client';

import { useEffect, useState } from 'react';
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

export default function QualidadeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'ncs' | 'charts'>('overview');
  const router = useRouter();

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

  const getBarWidth = (value: number, max: number) => {
    if (max === 0) return '0%';
    return `${Math.round((value / max) * 100)}%`;
  };

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
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total NCs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(ncStats.total)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Itens Afetados</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(ncStats.total_itens)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Reclamações</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(recStats.total)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Ações Corretivas</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{formatNumber(acStats.total)}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2 border-b pb-4">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'charts' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Análises
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status das NCs */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Status das Não Conformidades</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Fechadas</span>
                    <span className="text-sm font-bold text-gray-600">{formatNumber(ncStats.fechadas)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gray-500 h-3 rounded-full"
                      style={{ width: getBarWidth(Number(ncStats.fechadas), Number(ncStats.total)) }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Abertas</span>
                    <span className="text-sm font-bold text-red-600">{formatNumber(ncStats.abertas)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full"
                      style={{ width: getBarWidth(Number(ncStats.abertas), Number(ncStats.total)) }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Em Análise</span>
                    <span className="text-sm font-bold text-yellow-600">{formatNumber(ncStats.em_analise)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-yellow-500 h-3 rounded-full"
                      style={{ width: getBarWidth(Number(ncStats.em_analise), Number(ncStats.total)) }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Por Gravidade */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Gravidade</h3>
              <div className="space-y-3">
                {data.naoConformidades.porGravidade.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porGravidade.map(i => Number(i.count)));
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{item.gravidade || 'Não definida'}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getGravidadeColor(item.gravidade)}`}
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por Local/UF */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Unidade de Fabricação</h3>
              <div className="space-y-3">
                {data.naoConformidades.porLocal.slice(0, 6).map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porLocal.map(i => Number(i.count)));
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{item.local}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por Disposição */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Disposição</h3>
              <div className="space-y-3">
                {data.naoConformidades.porDisposicao.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porDisposicao.map(i => Number(i.count)));
                  const colors = ['bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-cyan-500', 'bg-teal-500'];
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{item.disposicao || 'Não definida'}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[index % colors.length]}`}
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por Tipo */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Tipos de NC</h3>
              <div className="space-y-3">
                {data.naoConformidades.porTipo.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porTipo.map(i => Number(i.count)));
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{item.tipo}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por Setor */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Processo de Origem</h3>
              <div className="space-y-3">
                {data.naoConformidades.porSetor.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porSetor.map(i => Number(i.count)));
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700">{item.setor}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full"
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Por Origem/Tarefa */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Tarefa de Origem</h3>
              <div className="space-y-3">
                {data.naoConformidades.porOrigem.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.porOrigem.map(i => Number(i.count)));
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate flex-1 mr-2">{item.origem}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Detectores */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 10 Detectores</h3>
              <div className="space-y-3">
                {data.naoConformidades.topDetectores.map((item, index) => {
                  const max = Math.max(...data.naoConformidades.topDetectores.map(i => Number(i.count)));
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate flex-1 mr-2">{item.responsavel}</span>
                        <span className="text-sm font-bold text-gray-900">{formatNumber(item.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: getBarWidth(Number(item.count), max) }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* NCs por Mês */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:col-span-2">
              <h3 className="text-lg font-bold text-gray-900 mb-4">NCs por Mês (Últimos 12 meses)</h3>
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
                        className="w-8 bg-blue-500 rounded-t"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                      <span className="text-xs text-gray-600 mt-1">{monthNames[parseInt(month) - 1]}</span>
                      <span className="text-xs text-gray-400">{year.slice(2)}</span>
                    </div>
                  );
                })}
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
                Ver todas as Não Conformidades →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
