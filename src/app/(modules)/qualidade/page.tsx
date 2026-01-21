'use client';

// v2.1 - Atualização de Qualidade com Dashboard e Filtros
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NaoConformidade, ReclamacaoCliente, AcaoCorretiva } from '@/types/qualidade';

interface QualidadeStats {
  naoConformidades: {
    total: number;
    abertas: number;
    emAnalise: number;
  };
  reclamacoes: {
    total: number;
    abertas: number;
    emAnalise: number;
  };
  acoesCorretivas: {
    total: number;
    abertas: number;
    emAndamento: number;
  };
}

export default function QualidadePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QualidadeStats>({
    naoConformidades: { total: 0, abertas: 0, emAnalise: 0 },
    reclamacoes: { total: 0, abertas: 0, emAnalise: 0 },
    acoesCorretivas: { total: 0, abertas: 0, emAndamento: 0 }
  });
  const [recentNCs, setRecentNCs] = useState<NaoConformidade[]>([]);
  const [recentReclamacoes, setRecentReclamacoes] = useState<ReclamacaoCliente[]>([]);
  const [recentAcoes, setRecentAcoes] = useState<AcaoCorretiva[]>([]);
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
      const [ncResponse, recResponse, acResponse] = await Promise.all([
        fetch('/api/qualidade/nao-conformidade').catch(() => null),
        fetch('/api/qualidade/reclamacao-cliente').catch(() => null),
        fetch('/api/qualidade/acao-corretiva').catch(() => null)
      ]);

      // Processar NCs
      if (ncResponse) {
        const ncData = await ncResponse.json().catch(() => ({ data: [] }));
        const ncs = ncData.data || [];
        setRecentNCs(ncs.slice(0, 5));
        setStats(prev => ({
          ...prev,
          naoConformidades: {
            total: ncs.length,
            abertas: ncs.filter((nc: NaoConformidade) => nc.status === 'ABERTA').length,
            emAnalise: ncs.filter((nc: NaoConformidade) => nc.status === 'EM_ANALISE').length
          }
        }));
      }

      // Processar Reclamações
      if (recResponse) {
        const recData = await recResponse.json().catch(() => ({ data: [] }));
        const recs = recData.data || [];
        setRecentReclamacoes(recs.slice(0, 5));
        setStats(prev => ({
          ...prev,
          reclamacoes: {
            total: recs.length,
            abertas: recs.filter((rec: ReclamacaoCliente) => rec.status === 'ABERTA').length,
            emAnalise: recs.filter((rec: ReclamacaoCliente) => rec.status === 'EM_ANALISE').length
          }
        }));
      }

      // Processar Ações Corretivas
      if (acResponse) {
        const acData = await acResponse.json().catch(() => ({ data: [] }));
        const acs = acData.data || [];
        setRecentAcoes(acs.slice(0, 5));
        setStats(prev => ({
          ...prev,
          acoesCorretivas: {
            total: acs.length,
            abertas: acs.filter((ac: AcaoCorretiva) => ac.status === 'ABERTA').length,
            emAndamento: acs.filter((ac: AcaoCorretiva) => ac.status === 'EM_ANDAMENTO').length
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'ABERTA': 'bg-red-100 text-red-800',
      'EM_ANALISE': 'bg-yellow-100 text-yellow-800',
      'EM_ANDAMENTO': 'bg-blue-100 text-blue-800',
      'PENDENTE_ACAO': 'bg-orange-100 text-orange-800',
      'AGUARDANDO_VERIFICACAO': 'bg-purple-100 text-purple-800',
      'RESPONDIDA': 'bg-green-100 text-green-800',
      'FECHADA': 'bg-gray-100 text-gray-800'
    };
    const statusLabels: Record<string, string> = {
      'ABERTA': 'Aberta',
      'EM_ANALISE': 'Em Análise',
      'EM_ANDAMENTO': 'Em Andamento',
      'PENDENTE_ACAO': 'Pendente Ação',
      'AGUARDANDO_VERIFICACAO': 'Aguard. Verificação',
      'RESPONDIDA': 'Respondida',
      'FECHADA': 'Fechada'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando...</p>
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
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Voltar aos Módulos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Qualidade</h1>
                {user && (
                  <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/qualidade/dashboard"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Cards de Acesso Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Não Conformidades */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Não Conformidades</h3>
                  <p className="text-red-100 text-sm">Registro e tratamento de NCs</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.naoConformidades.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.naoConformidades.abertas}</div>
                  <div className="text-xs text-gray-500">Abertas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.naoConformidades.emAnalise}</div>
                  <div className="text-xs text-gray-500">Em Análise</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/qualidade/nao-conformidade"
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                >
                  Ver Todas
                </Link>
                <Link
                  href="/qualidade/nao-conformidade/nova"
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-center text-sm font-medium"
                >
                  Nova NC
                </Link>
              </div>
            </div>
          </div>

          {/* Reclamações de Clientes */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Reclamações</h3>
                  <p className="text-orange-100 text-sm">Reclamações de Clientes</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.reclamacoes.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.reclamacoes.abertas}</div>
                  <div className="text-xs text-gray-500">Abertas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.reclamacoes.emAnalise}</div>
                  <div className="text-xs text-gray-500">Em Análise</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/qualidade/reclamacao-cliente"
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                >
                  Ver Todas
                </Link>
                <Link
                  href="/qualidade/reclamacao-cliente/nova"
                  className="flex-1 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-center text-sm font-medium"
                >
                  Nova Reclamação
                </Link>
              </div>
            </div>
          </div>

          {/* Ações Corretivas */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Ações Corretivas</h3>
                  <p className="text-green-100 text-sm">Gestão de ações</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{stats.acoesCorretivas.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.acoesCorretivas.abertas}</div>
                  <div className="text-xs text-gray-500">Abertas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.acoesCorretivas.emAndamento}</div>
                  <div className="text-xs text-gray-500">Em Andamento</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/qualidade/acao-corretiva"
                  className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center text-sm font-medium"
                >
                  Ver Todas
                </Link>
                <Link
                  href="/qualidade/acao-corretiva/nova"
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-center text-sm font-medium"
                >
                  Nova Ação
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Registros Recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NCs Recentes */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              NCs Recentes
            </h3>
            {recentNCs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma NC registrada</p>
            ) : (
              <div className="space-y-3">
                {recentNCs.map(nc => (
                  <Link
                    key={nc.id}
                    href={`/qualidade/nao-conformidade/${nc.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">{nc.numero}</span>
                      {getStatusBadge(nc.status)}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{nc.descricao}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(nc.data_ocorrencia)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Reclamações Recentes */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
              Reclamações Recentes
            </h3>
            {recentReclamacoes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma reclamação registrada</p>
            ) : (
              <div className="space-y-3">
                {recentReclamacoes.map(rec => (
                  <Link
                    key={rec.id}
                    href={`/qualidade/reclamacao-cliente/${rec.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">{rec.numero}</span>
                      {getStatusBadge(rec.status)}
                    </div>
                    <p className="text-xs text-gray-700 font-medium">{rec.cliente_nome}</p>
                    <p className="text-xs text-gray-600 truncate">{rec.descricao}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(rec.data_reclamacao)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Ações Recentes */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Ações Corretivas Recentes
            </h3>
            {recentAcoes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhuma ação registrada</p>
            ) : (
              <div className="space-y-3">
                {recentAcoes.map(ac => (
                  <Link
                    key={ac.id}
                    href={`/qualidade/acao-corretiva/${ac.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-900">{ac.numero}</span>
                      {getStatusBadge(ac.status)}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{ac.descricao_problema}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(ac.data_abertura)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-600 text-xs sm:text-sm">
            Módulo de Qualidade - Gestão de NCs, Reclamações e Ações Corretivas
          </p>
        </div>
      </footer>
    </div>
  );
}
