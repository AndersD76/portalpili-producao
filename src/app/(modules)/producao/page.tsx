'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OPDCard from '@/components/OPDCard';
import Modal from '@/components/Modal';
import OPDForm from '@/components/OPDForm';
import { OPD } from '@/types/opd';
import { useAuth } from '@/contexts/AuthContext';

export default function ProducaoHome() {
  const [opds, setOpds] = useState<OPD[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewOPDModal, setShowNewOPDModal] = useState(false);
  const [diasFilter, setDiasFilter] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'urgencia' | 'alfabetica' | 'recentes'>('urgencia');
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();
  const { user, authenticated, loading: authLoading, podeExecutarAcao, logout } = useAuth();

  // Calcular dias restantes até a data de entrega (mesma lógica do OPDCard)
  const calcularDiasRestantes = (opd: OPD): number | null => {
    // Usar data_entrega como prioridade (igual ao OPDCard)
    const dataRef = opd.data_entrega || opd.previsao_termino;
    if (!dataRef) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataTermino = new Date(dataRef);
    dataTermino.setHours(0, 0, 0, 0);

    const diffTime = dataTermino.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  // Filtrar OPDs por dias restantes
  const filtrarPorDias = (opd: OPD): boolean => {
    if (diasFilter === 'todos') return true;

    const diasRestantes = calcularDiasRestantes(opd);

    // OPDs sem data de previsão não aparecem nos filtros de dias
    if (diasRestantes === null) return diasFilter === 'sem_data';

    switch (diasFilter) {
      case 'atrasadas':
        return diasRestantes < 0;
      case 'hoje':
        return diasRestantes === 0;
      case '3dias':
        return diasRestantes >= 0 && diasRestantes <= 3;
      case '7dias':
        return diasRestantes >= 0 && diasRestantes <= 7;
      case '30dias':
        return diasRestantes >= 0 && diasRestantes <= 30;
      case 'sem_data':
        return false;
      default:
        return true;
    }
  };

  // Ordenar OPDs
  const ordenarOpds = (opdsParaOrdenar: OPD[]): OPD[] => {
    return [...opdsParaOrdenar].sort((a, b) => {
      switch (ordenacao) {
        case 'urgencia':
          const diasA = calcularDiasRestantes(a);
          const diasB = calcularDiasRestantes(b);
          // OPDs sem data vão para o final
          if (diasA === null && diasB === null) return 0;
          if (diasA === null) return 1;
          if (diasB === null) return -1;
          return diasA - diasB;
        case 'alfabetica':
          return a.numero.localeCompare(b.numero);
        case 'recentes':
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        default:
          return 0;
      }
    });
  };

  const fetchOPDs = async () => {
    try {
      const response = await fetch('/api/opds', {
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.success) {
        setOpds(data.data);
        setError(null);
      } else {
        setError('Erro ao carregar OPDs');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchOPDs();
  }, [authLoading, authenticated]);

  const handleLogout = () => {
    logout();
  };

  const handleSyncSinprod = async () => {
    setSyncing(true);
    setSyncStatus(null);
    try {
      const response = await fetch('/api/sinprod/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'update' })
      });
      const data = await response.json();

      if (data.success) {
        setSyncStatus({
          message: `Sincronizado: ${data.stats.updated} atualizadas`,
          type: 'success'
        });
        fetchOPDs(); // Recarregar OPDs
      } else {
        setSyncStatus({
          message: data.error || 'Erro na sincronização',
          type: 'error'
        });
      }
    } catch (err) {
      setSyncStatus({
        message: 'Erro ao conectar com SINPROD',
        type: 'error'
      });
    } finally {
      setSyncing(false);
      // Limpar mensagem após 5 segundos
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const filteredOpds = ordenarOpds(
    opds
      .filter((opd) => opd.numero.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(filtrarPorDias)
  );

  // Contagem para os badges dos filtros
  const contarOpdsPorFiltro = (filtro: string): number => {
    const opdsFiltradas = opds.filter((opd) => {
      const diasRestantes = calcularDiasRestantes(opd);

      if (diasRestantes === null) return filtro === 'sem_data';

      switch (filtro) {
        case 'atrasadas':
          return diasRestantes < 0;
        case 'hoje':
          return diasRestantes === 0;
        case '3dias':
          return diasRestantes >= 0 && diasRestantes <= 3;
        case '7dias':
          return diasRestantes >= 0 && diasRestantes <= 7;
        case '30dias':
          return diasRestantes >= 0 && diasRestantes <= 30;
        default:
          return true;
      }
    });
    return opdsFiltradas.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando OPDs...</p>
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
              fetchOPDs();
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Produção</h1>
                {user && (
                  <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/producao/dashboard"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </Link>
              <Link
                href="/producao/calendario"
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
                title="Calendário"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </Link>
              <button
                onClick={handleSyncSinprod}
                disabled={syncing}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                title="Sincronizar com SINPROD"
              >
                <svg className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {podeExecutarAcao('PRODUCAO', 'criar') && (
                <button
                  onClick={() => setShowNewOPDModal(true)}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Nova OPD</span>
                </button>
              )}
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

      {/* Toolbar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Search Bar */}
          <input
            type="text"
            placeholder="Buscar por número da OPD..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
          />

          {/* Sync Status Message */}
          {syncStatus && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${
              syncStatus.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {syncStatus.message}
            </div>
          )}

          {/* Filtros por Dias */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 font-medium">Filtrar:</span>
              <button
                onClick={() => setDiasFilter('todos')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  diasFilter === 'todos'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas ({opds.length})
              </button>
              <button
                onClick={() => setDiasFilter('atrasadas')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  diasFilter === 'atrasadas'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Atrasadas ({contarOpdsPorFiltro('atrasadas')})
              </button>
              <button
                onClick={() => setDiasFilter('hoje')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  diasFilter === 'hoje'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                Hoje ({contarOpdsPorFiltro('hoje')})
              </button>
              <button
                onClick={() => setDiasFilter('3dias')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  diasFilter === '3dias'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                3 dias ({contarOpdsPorFiltro('3dias')})
              </button>
              <button
                onClick={() => setDiasFilter('7dias')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  diasFilter === '7dias'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                7 dias ({contarOpdsPorFiltro('7dias')})
              </button>
              <button
                onClick={() => setDiasFilter('30dias')}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                  diasFilter === '30dias'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                30 dias ({contarOpdsPorFiltro('30dias')})
              </button>

              {/* Separador - esconde em mobile muito pequeno */}
              <div className="hidden sm:block h-6 w-px bg-gray-300 mx-1 sm:mx-2"></div>

            {/* Ordenação */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs text-gray-500 font-medium">Ordenar:</span>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as 'urgencia' | 'alfabetica' | 'recentes')}
                className="px-2 py-1 rounded-lg text-xs border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="urgencia">Por urgência</option>
                <option value="alfabetica">Alfabética</option>
                <option value="recentes">Mais recentes</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <p>
              Total: <span className="font-semibold text-gray-700">{opds.length}</span> OPDs
            </p>
            {(searchTerm || diasFilter !== 'todos') && (
              <p>
                Exibindo: <span className="font-semibold text-gray-700">{filteredOpds.length}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {filteredOpds.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhuma OPD encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredOpds.map((opd) => (
              <OPDCard key={opd.id} opd={opd} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-600 text-xs sm:text-sm">
            Módulo de Produção - Controle Geral da Produção
          </p>
        </div>
      </footer>

      {/* Modal para Nova OPD */}
      <Modal
        isOpen={showNewOPDModal}
        onClose={() => setShowNewOPDModal(false)}
        title="Criar Nova OPD"
      >
        <OPDForm
          onSuccess={() => {
            setShowNewOPDModal(false);
            setOrdenacao('recentes'); // Mostrar a nova OPD no topo
            setDiasFilter('todos'); // Limpar filtros
            fetchOPDs();
          }}
          onCancel={() => setShowNewOPDModal(false)}
        />
      </Modal>
    </div>
  );
}
