'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OPD } from '@/types/opd';
import { Atividade } from '@/types/atividade';

interface DashboardStats {
  totalOPDs: number;
  opdsEmAndamento: number;
  opdsConcluidas: number;
  opdsPendentes: number;
  totalAtividades: number;
  atividadesConcluidas: number;
  atividadesEmAndamento: number;
  atividadesPendentes: number;
  tempoMedioConclusao: number;
  entregasProximos7Dias: number;
  entregasAtrasadas: number;
  opdsPai: number;
  opdsFilha: number;
}

export default function DashboardPage() {
  const [opds, setOpds] = useState<OPD[]>([]);
  const [todasAtividades, setTodasAtividades] = useState<(Atividade & { opd_cliente?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const [selectedOPD, setSelectedOPD] = useState<string>('todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedResponsavel, setSelectedResponsavel] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'stats' | 'timeline' | 'tasks'>('stats');

  const [stats, setStats] = useState<DashboardStats>({
    totalOPDs: 0,
    opdsEmAndamento: 0,
    opdsConcluidas: 0,
    opdsPendentes: 0,
    totalAtividades: 0,
    atividadesConcluidas: 0,
    atividadesEmAndamento: 0,
    atividadesPendentes: 0,
    tempoMedioConclusao: 0,
    entregasProximos7Dias: 0,
    entregasAtrasadas: 0,
    opdsPai: 0,
    opdsFilha: 0
  });

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
      console.error('Erro ao parsear dados do usuário');
      router.push('/login');
      return;
    }

    fetchOPDs();
  }, []);

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

  const fetchOPDs = async () => {
    try {
      const response = await fetch('/api/opds');
      const data = await response.json();

      if (data.success) {
        setOpds(data.data);
        calculateStats(data.data);
        await fetchAllAtividades(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar OPDs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAtividades = async (opds: OPD[]) => {
    try {
      const allAtividades: (Atividade & { opd_cliente?: string })[] = [];

      for (const opd of opds) {
        const response = await fetch(`/api/atividades/${opd.numero}`);
        const data = await response.json();

        if (data.success) {
          const atividadesComOPD = data.data.map((ativ: Atividade) => ({
            ...ativ,
            opd_cliente: opd.cliente || opd.numero
          }));
          allAtividades.push(...atividadesComOPD);
        }
      }

      setTodasAtividades(allAtividades);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    }
  };

  const calculateStats = (opds: OPD[]) => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const totalOPDs = opds.length;
    const opdsConcluidas = opds.filter(opd => (opd.percentual_conclusao || 0) >= 100).length;
    const opdsEmAndamento = opds.filter(opd => {
      const perc = opd.percentual_conclusao || 0;
      return perc > 0 && perc < 100;
    }).length;
    const opdsPendentes = totalOPDs - opdsConcluidas - opdsEmAndamento;

    const opdsPai = opds.filter(opd => opd.tipo_opd === 'PAI').length;
    const opdsFilha = opds.filter(opd => opd.tipo_opd === 'FILHA').length;

    const totalAtividades = opds.reduce((sum, opd) => sum + (Number(opd.total_atividades) || 0), 0);
    const atividadesConcluidas = opds.reduce((sum, opd) => sum + (Number(opd.atividades_concluidas) || 0), 0);
    const atividadesEmAndamento = opds.reduce((sum, opd) => sum + (Number(opd.atividades_em_andamento) || 0), 0);
    const atividadesPendentes = opds.reduce((sum, opd) => sum + (Number(opd.atividades_a_realizar) || 0), 0);

    const entregasProximos7Dias = opds.filter(opd => {
      if (!opd.data_entrega) return false;
      const dataEntrega = new Date(opd.data_entrega);
      return dataEntrega >= now && dataEntrega <= sevenDaysFromNow;
    }).length;

    const entregasAtrasadas = opds.filter(opd => {
      if (!opd.data_entrega) return false;
      const dataEntrega = new Date(opd.data_entrega);
      const percConclusao = opd.percentual_conclusao || 0;
      return dataEntrega < now && percConclusao < 100;
    }).length;

    let tempoMedioConclusao = 0;
    const opdsComTempo = opds.filter(opd => opd.previsao_inicio && opd.previsao_termino);
    if (opdsComTempo.length > 0) {
      const tempos = opdsComTempo.map(opd => {
        const inicio = new Date(opd.previsao_inicio!);
        const fim = new Date(opd.previsao_termino!);
        return (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
      });
      tempoMedioConclusao = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    }

    setStats({
      totalOPDs,
      opdsConcluidas,
      opdsEmAndamento,
      opdsPendentes,
      totalAtividades,
      atividadesConcluidas,
      atividadesEmAndamento,
      atividadesPendentes,
      tempoMedioConclusao,
      entregasProximos7Dias,
      entregasAtrasadas,
      opdsPai,
      opdsFilha
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONCLUÍDA': return '✓';
      case 'EM ANDAMENTO': return '↻';
      default: return '○';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONCLUÍDA': return 'text-green-600';
      case 'EM ANDAMENTO': return 'text-yellow-600';
      default: return 'text-gray-400';
    }
  };

  const atividadesFiltradas = todasAtividades.filter(atividade => {
    if (selectedOPD !== 'todas' && atividade.numero_opd !== selectedOPD) return false;
    if (selectedStatus !== 'todos' && atividade.status !== selectedStatus) return false;
    if (selectedResponsavel !== 'todos' && atividade.responsavel !== selectedResponsavel) return false;
    return true;
  });

  const responsaveis = Array.from(new Set(todasAtividades.map(a => a.responsavel))).sort();

  const atividadesTimeline = atividadesFiltradas
    .filter(a => !a.parent_id)
    .sort((a, b) => {
      const dateA = new Date(a.previsao_inicio || 0).getTime();
      const dateB = new Date(b.previsao_inicio || 0).getTime();
      return dateA - dateB;
    });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/producao"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard de Produção</h1>
                {user && (
                  <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setLoading(true); fetchOPDs(); }}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Atualizar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <Link
                href="/producao/calendario"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Calendário"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </Link>
              <Link
                href="/"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Módulos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total de OPDs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalOPDs}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Atividades</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.totalAtividades.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Em 7 dias</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{stats.entregasProximos7Dias}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Atrasadas</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">{stats.entregasAtrasadas}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de Visualização */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2 border-b pb-4 mb-4">
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'stats' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Estatísticas
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'tasks' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas as Tarefas
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm ${
                viewMode === 'timeline' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Linha do Tempo
            </button>
          </div>

          {/* Filtros */}
          {(viewMode === 'tasks' || viewMode === 'timeline') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por OPD</label>
                <select
                  value={selectedOPD}
                  onChange={(e) => setSelectedOPD(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                >
                  <option value="todas">Todas as OPDs</option>
                  {opds.map(opd => (
                    <option key={opd.id} value={opd.numero}>
                      OPD {opd.numero} {opd.cliente ? `- ${opd.cliente}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="A REALIZAR">A Realizar</option>
                  <option value="EM ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUÍDA">Concluída</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Responsável</label>
                <select
                  value={selectedResponsavel}
                  onChange={(e) => setSelectedResponsavel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                >
                  <option value="todos">Todos os Responsáveis</option>
                  {responsaveis.map(resp => (
                    <option key={resp} value={resp}>{resp}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo baseado no modo */}
        {viewMode === 'stats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">OPDs em Andamento</h3>
              {opds.filter(opd => (opd.percentual_conclusao || 0) > 0 && (opd.percentual_conclusao || 0) < 100).length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhuma OPD em andamento</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {opds
                    .filter(opd => (opd.percentual_conclusao || 0) > 0 && (opd.percentual_conclusao || 0) < 100)
                    .sort((a, b) => (b.percentual_conclusao || 0) - (a.percentual_conclusao || 0))
                    .map(opd => (
                      <Link
                        key={opd.id}
                        href={`/producao/opd/${opd.numero}`}
                        className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900 text-sm sm:text-base">OPD {opd.numero}</span>
                          <span className="text-sm text-gray-600">{opd.percentual_conclusao}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${opd.percentual_conclusao}%` }}
                          ></div>
                        </div>
                      </Link>
                    ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Distribuição de Status</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Concluídas</span>
                    <span className="text-sm font-bold text-green-600">{stats.atividadesConcluidas}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full"
                      style={{ width: `${stats.totalAtividades > 0 ? (stats.atividadesConcluidas / stats.totalAtividades) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Em Andamento</span>
                    <span className="text-sm font-bold text-yellow-600">{stats.atividadesEmAndamento}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-yellow-500 h-3 rounded-full"
                      style={{ width: `${stats.totalAtividades > 0 ? (stats.atividadesEmAndamento / stats.totalAtividades) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Pendentes</span>
                    <span className="text-sm font-bold text-gray-600">{stats.atividadesPendentes}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gray-400 h-3 rounded-full"
                      style={{ width: `${stats.totalAtividades > 0 ? (stats.atividadesPendentes / stats.totalAtividades) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'tasks' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Todas as Tarefas ({atividadesFiltradas.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">OPD</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Atividade</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Responsável</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Prev. Início</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {atividadesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        Nenhuma atividade encontrada
                      </td>
                    </tr>
                  ) : (
                    atividadesFiltradas.slice(0, 100).map(atividade => (
                      <tr key={atividade.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <span className={`text-xl ${getStatusColor(atividade.status)}`}>
                            {getStatusIcon(atividade.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/producao/opd/${atividade.numero_opd}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            {atividade.numero_opd}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm text-gray-900">{atividade.atividade}</span>
                          {atividade.parent_id && (
                            <span className="ml-2 text-xs text-gray-500">(Subtarefa)</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{atividade.responsavel}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600">{formatDate(atividade.previsao_inicio)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Linha do Tempo</h3>
            {atividadesTimeline.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma atividade encontrada</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                <div className="space-y-6">
                  {atividadesTimeline.slice(0, 50).map((atividade) => (
                    <div key={atividade.id} className="relative pl-12 sm:pl-20">
                      <div className={`absolute left-2 sm:left-6 w-5 h-5 rounded-full border-4 ${
                        atividade.status === 'CONCLUÍDA' ? 'bg-green-500 border-green-200' :
                        atividade.status === 'EM ANDAMENTO' ? 'bg-yellow-500 border-yellow-200' :
                        'bg-gray-300 border-gray-200'
                      }`}></div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Link
                                href={`/producao/opd/${atividade.numero_opd}`}
                                className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                              >
                                OPD {atividade.numero_opd}
                              </Link>
                              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{atividade.responsavel}</span>
                            </div>
                            <h4 className="font-medium text-gray-900 text-sm sm:text-base">{atividade.atividade}</h4>
                            <div className="flex flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-600">
                              <span>Prev: {formatDate(atividade.previsao_inicio)}</span>
                            </div>
                          </div>
                          <span className={`text-xl sm:text-2xl ${getStatusColor(atividade.status)} ml-2`}>
                            {getStatusIcon(atividade.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
