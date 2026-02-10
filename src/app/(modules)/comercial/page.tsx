'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface PipelineEstagio {
  estagio: string;
  quantidade: number;
  valor_total: number;
}

// Mapeamento de cores e labels para estágios conhecidos
const ESTAGIO_CONFIG: Record<string, { label: string; cor: string; ordem: number }> = {
  EM_NEGOCIACAO: { label: 'Negociação', cor: 'bg-orange-500', ordem: 1 },
  PROSPECCAO: { label: 'Prospecção', cor: 'bg-blue-500', ordem: 2 },
  FECHADA: { label: 'Fechada', cor: 'bg-green-500', ordem: 3 },
  PERDIDA: { label: 'Perdida', cor: 'bg-red-500', ordem: 4 },
  TESTE: { label: 'Teste', cor: 'bg-pink-500', ordem: 5 },
  SUBSTITUIDO: { label: 'Substituído', cor: 'bg-indigo-500', ordem: 6 },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-yellow-600', ordem: 7 },
  PROPOSTA: { label: 'Proposta', cor: 'bg-purple-500', ordem: 8 },
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-cyan-500', ordem: 9 },
  QUALIFICACAO: { label: 'Qualificação', cor: 'bg-teal-500', ordem: 10 },
};

const AUTO_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutos

export default function ComercialPage() {
  const [loading, setLoading] = useState(true);
  const [estagios, setEstagios] = useState<Array<{ key: string; label: string; cor: string; quantidade: number; valor: number }>>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);
  const syncTriggered = useRef(false);
  const router = useRouter();
  const { user, authenticated, loading: authLoading, logout } = useAuth();

  const fetchPipeline = useCallback(async () => {
    try {
      const response = await fetch('/api/comercial/oportunidades');
      if (response.ok) {
        const data = await response.json();
        const pipelineData: PipelineEstagio[] = data.pipeline || [];

        // Construir estágios dinamicamente a partir dos dados
        const items = pipelineData
          .filter(p => parseInt(String(p.quantidade)) > 0)
          .map(p => {
            const config = ESTAGIO_CONFIG[p.estagio] || {
              label: p.estagio.replace(/_/g, ' '),
              cor: 'bg-gray-500',
              ordem: 99,
            };
            return {
              key: p.estagio,
              label: config.label,
              cor: config.cor,
              ordem: config.ordem,
              quantidade: parseInt(String(p.quantidade)) || 0,
              valor: parseFloat(String(p.valor_total)) || 0,
            };
          })
          .sort((a, b) => a.ordem - b.ordem);

        setEstagios(items);
      }
    } catch (error) {
      console.error('Erro ao buscar pipeline:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncStatus = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/comercial/sync');
      if (response.ok) {
        const data = await response.json();
        if (data.data?.ultimo_sync) {
          setUltimoSync(data.data.ultimo_sync);
          return data.data.ultimo_sync;
        }
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  const runSync = useCallback(async (silent = false) => {
    setSyncing(true);
    if (!silent) setSyncResult(null);
    try {
      const response = await fetch('/api/comercial/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'full' }),
      });
      const data = await response.json();
      if (data.success) {
        if (!silent) {
          setSyncResult({
            message: `Sync concluído: ${data.novas} novas, ${data.atualizadas} atualizadas, ${data.erros} erros`,
            type: 'success',
          });
        }
        await fetchPipeline();
        await fetchSyncStatus();
      } else if (!silent) {
        setSyncResult({ message: data.error || 'Erro no sync', type: 'error' });
      }
    } catch {
      if (!silent) {
        setSyncResult({ message: 'Erro de conexão ao sincronizar', type: 'error' });
      }
    } finally {
      setSyncing(false);
    }
  }, [fetchPipeline, fetchSyncStatus]);

  // Carregamento inicial: buscar dados + auto-sync se necessário
  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }

    const init = async () => {
      // Buscar pipeline e status do sync em paralelo
      const [, lastSync] = await Promise.all([fetchPipeline(), fetchSyncStatus()]);

      // Auto-sync se nunca sincronizou ou último sync > 30min atrás
      if (!syncTriggered.current) {
        syncTriggered.current = true;
        const needsSync = !lastSync || (Date.now() - new Date(lastSync).getTime() > AUTO_SYNC_INTERVAL);
        if (needsSync) {
          runSync(true); // sync silencioso em background
        }
      }
    };

    init();
  }, [authLoading, authenticated, router, fetchPipeline, fetchSyncStatus, runSync]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalOportunidades = estagios.reduce((sum, e) => sum + e.quantidade, 0);
  const totalValor = estagios.reduce((sum, e) => sum + e.valor, 0);

  // Calcular grid columns baseado na quantidade de estágios
  const gridCols = estagios.length <= 4 ? 'grid-cols-2 sm:grid-cols-4'
    : estagios.length <= 6 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'
    : 'grid-cols-2 sm:grid-cols-4 md:grid-cols-7';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Sincronizando planilha...</p>
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
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Pipeline Comercial</h1>
                {user && (
                  <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {syncing && (
                <span className="text-xs text-gray-400 hidden sm:inline">Sincronizando...</span>
              )}
              <button
                onClick={() => runSync(false)}
                disabled={syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  syncing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
                title="Sincronizar com Google Sheets"
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sync'}</span>
              </button>
              <button
                onClick={logout}
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

      {/* Sync Result Banner */}
      {syncResult && (
        <div className={`mx-4 sm:mx-auto max-w-7xl mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
          syncResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {syncResult.message}
          <button onClick={() => setSyncResult(null)} className="float-right font-bold opacity-60 hover:opacity-100">x</button>
        </div>
      )}

      {/* Pipeline */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Título + Último sync */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Pipeline de Vendas</h2>
            {ultimoSync && (
              <span className="text-xs text-gray-400">
                Atualizado: {new Date(ultimoSync).toLocaleString('pt-BR')}
              </span>
            )}
          </div>

          {/* Estágios - dinâmicos a partir dos dados da planilha */}
          <div className={`grid ${gridCols} gap-3 mb-6`}>
            {estagios.map((estagio) => (
              <Link
                key={estagio.key}
                href={`/comercial/pipeline?estagio=${estagio.key}`}
                className="text-center group"
              >
                <div className={`${estagio.cor} text-white rounded-lg p-3 sm:p-4 mb-2 group-hover:opacity-90 transition shadow-sm`}>
                  <div className="text-2xl sm:text-3xl font-bold">{estagio.quantidade}</div>
                  <div className="text-xs opacity-80 mt-1">{formatCurrency(estagio.valor)}</div>
                </div>
                <div className="text-xs font-medium text-gray-600">{estagio.label}</div>
              </Link>
            ))}
          </div>

          {/* Totais */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-4 border-t">
            <div>
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900 ml-2">{totalOportunidades} oportunidades</span>
            </div>
            <div>
              <span className="text-gray-600">Valor:</span>
              <span className="font-bold text-green-600 ml-2">{formatCurrency(totalValor)}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
