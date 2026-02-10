'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Oportunidade {
  id: number;
  titulo: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  cliente_cnpj?: string;
  vendedor_nome?: string;
  vendedor_id?: number;
  tipo_produto?: string;
  valor_estimado: number;
  probabilidade: number;
  estagio: string;
  status: string;
  total_atividades?: number;
  atividades_atrasadas?: number;
  created_at: string;
}

interface Vendedor {
  id: number;
  nome: string;
  email: string;
  total_oportunidades: number;
  oportunidades_ganhas: number;
  valor_total_ganho: number;
  total_clientes: number;
}

interface PipelineEstagio {
  estagio: string;
  quantidade: number;
  valor_total: number;
}

const ESTAGIO_CONFIG: Record<string, { label: string; cor: string; corHex: string }> = {
  EM_NEGOCIACAO: { label: 'Negociação', cor: 'bg-orange-500', corHex: '#f97316' },
  PROSPECCAO: { label: 'Prospecção', cor: 'bg-blue-500', corHex: '#3b82f6' },
  FECHADA: { label: 'Fechada', cor: 'bg-green-500', corHex: '#22c55e' },
  PERDIDA: { label: 'Perdida', cor: 'bg-red-500', corHex: '#ef4444' },
  TESTE: { label: 'Teste', cor: 'bg-pink-500', corHex: '#ec4899' },
  SUBSTITUIDO: { label: 'Substituído', cor: 'bg-indigo-500', corHex: '#6366f1' },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-yellow-600', corHex: '#ca8a04' },
  PROPOSTA: { label: 'Proposta', cor: 'bg-purple-500', corHex: '#a855f7' },
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4' },
  QUALIFICACAO: { label: 'Qualificação', cor: 'bg-teal-500', corHex: '#14b8a6' },
};

const AUTO_SYNC_INTERVAL = 30 * 60 * 1000;

// Safe number parser
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

export default function ComercialPage() {
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEstagio[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);
  const syncTriggered = useRef(false);

  const [filtroVendedor, setFiltroVendedor] = useState<string | null>(null);
  const [filtroEstagio, setFiltroEstagio] = useState<string>('');
  const [filtroProb, setFiltroProb] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<string>('valor');

  const router = useRouter();
  const { user, authenticated, loading: authLoading, logout, isAdmin } = useAuth();

  // ==================== DATA FETCHING ====================

  // Use refs to avoid re-creating callbacks on auth state changes
  const userRef = useRef(user);
  const isAdminRef = useRef(isAdmin);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    try {
      // Non-admin: filter by own usuario_id
      const opUrl = isAdminRef.current
        ? '/api/comercial/oportunidades?limit=2000'
        : `/api/comercial/oportunidades?limit=2000&usuario_id=${userRef.current?.id || ''}`;
      const [opRes, vendRes] = await Promise.all([
        fetch(opUrl),
        fetch('/api/comercial/vendedores?ativo=true'),
      ]);
      if (opRes.ok) {
        const opData = await opRes.json();
        setOportunidades(opData.data || []);
        setPipeline(opData.pipeline || []);
      }
      if (vendRes.ok) {
        const vendData = await vendRes.json();
        setVendedores(vendData.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSyncStatus = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/comercial/sync');
      if (res.ok) {
        const data = await res.json();
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
      const res = await fetch('/api/comercial/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'full' }),
      });
      const data = await res.json();
      if (data.success) {
        if (!silent) {
          setSyncResult({
            message: `Sync: ${data.novas} novas, ${data.atualizadas} atualizadas, ${data.erros} erros`,
            type: 'success',
          });
        }
        await fetchAll();
        await fetchSyncStatus();
      } else if (!silent) {
        setSyncResult({ message: data.error || 'Erro no sync', type: 'error' });
      }
    } catch {
      if (!silent) setSyncResult({ message: 'Erro de conexão', type: 'error' });
    } finally {
      setSyncing(false);
    }
  }, [fetchAll, fetchSyncStatus]);

  // Auth redirect - separate effect with minimal deps
  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); }
  }, [authLoading, authenticated, router]);

  // Data loading - only runs once user is authenticated
  useEffect(() => {
    if (authLoading || !authenticated || !user) return;
    const init = async () => {
      const [, lastSync] = await Promise.all([fetchAll(), fetchSyncStatus()]);
      if (!syncTriggered.current) {
        syncTriggered.current = true;
        if (!lastSync || (Date.now() - new Date(lastSync).getTime() > AUTO_SYNC_INTERVAL)) {
          runSync(true);
        }
      }
    };
    init();
  }, [authLoading, authenticated, user, fetchAll, fetchSyncStatus, runSync]);

  // ==================== COMPUTED ====================

  const listaFiltrada = useMemo(() => {
    let lista = [...oportunidades];
    if (filtroVendedor) lista = lista.filter(o => o.vendedor_nome === filtroVendedor);
    if (filtroEstagio) lista = lista.filter(o => o.estagio === filtroEstagio);
    if (filtroProb === 'alta') lista = lista.filter(o => toNum(o.probabilidade) >= 70);
    else if (filtroProb === 'media') lista = lista.filter(o => toNum(o.probabilidade) >= 40 && toNum(o.probabilidade) < 70);
    else if (filtroProb === 'baixa') lista = lista.filter(o => toNum(o.probabilidade) < 40);
    if (filtroBusca) {
      const b = filtroBusca.toLowerCase();
      lista = lista.filter(o =>
        (o.cliente_nome || '').toLowerCase().includes(b) ||
        (o.titulo || '').toLowerCase().includes(b) ||
        (o.cliente_cnpj || '').includes(b)
      );
    }
    if (ordenacao === 'prob') lista.sort((a, b) => toNum(b.probabilidade) - toNum(a.probabilidade));
    else if (ordenacao === 'valor') lista.sort((a, b) => toNum(b.valor_estimado) - toNum(a.valor_estimado));
    else if (ordenacao === 'recente') lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return lista;
  }, [oportunidades, filtroVendedor, filtroEstagio, filtroProb, filtroBusca, ordenacao]);

  const resumo = useMemo(() => {
    const ativas = oportunidades.filter(o => o.status === 'ABERTA');
    const ganhas = oportunidades.filter(o => o.estagio === 'FECHADA');
    const perdidas = oportunidades.filter(o => o.estagio === 'PERDIDA');
    const totalDec = ganhas.length + perdidas.length;
    return {
      total: oportunidades.length,
      ativas: ativas.length,
      valorPipeline: ativas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
      ganhos: ganhas.length,
      valorGanho: ganhas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
      taxa: totalDec > 0 ? Math.round((ganhas.length / totalDec) * 100) : 0,
    };
  }, [oportunidades]);

  const estagiosAtivos = useMemo(() => {
    return pipeline
      .filter(p => parseInt(String(p.quantidade)) > 0)
      .map(p => ({
        key: p.estagio,
        label: ESTAGIO_CONFIG[p.estagio]?.label || p.estagio,
        cor: ESTAGIO_CONFIG[p.estagio]?.cor || 'bg-gray-500',
        corHex: ESTAGIO_CONFIG[p.estagio]?.corHex || '#6b7280',
        quantidade: parseInt(String(p.quantidade)) || 0,
        valor: toNum(p.valor_total),
      }))
      .sort((a, b) => {
        const order: Record<string, number> = { EM_NEGOCIACAO: 1, PROSPECCAO: 2, FECHADA: 3, PERDIDA: 4, TESTE: 5, SUBSTITUIDO: 6, SUSPENSO: 7 };
        return (order[a.key] || 99) - (order[b.key] || 99);
      });
  }, [pipeline]);

  const vendedoresComMetricas = useMemo(() => {
    return vendedores.map(v => {
      const ops = oportunidades.filter(o => o.vendedor_nome === v.nome);
      const ativas = ops.filter(o => o.status === 'ABERTA');
      return {
        ...v,
        opsAtivas: ativas.length,
        opsTotal: ops.length,
        valorAtivo: ativas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
      };
    }).sort((a, b) => b.valorAtivo - a.valorAtivo);
  }, [vendedores, oportunidades]);

  // ==================== HELPERS ====================

  const fmt = (v: number) => {
    if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return 'R$ ' + Math.round(v / 1000) + 'k';
    return 'R$ ' + v.toLocaleString('pt-BR');
  };

  const fmtFull = (v: unknown) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(toNum(v));
  };

  const diasNoFunil = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  const probBg = (p: number) => {
    if (p >= 70) return 'bg-green-100 text-green-800';
    if (p >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // ==================== LOADING ====================

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* HEADER - padrão do app */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Pipeline Comercial</h1>
                {user && <p className="text-xs text-gray-500 hidden sm:block">{user.nome}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/comercial/pipeline" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                Kanban
              </Link>
              <Link href="/comercial/vendedores" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Vendedores
              </Link>
              <Link href="/comercial/clientes" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Clientes
              </Link>
              <Link href="/comercial/relatorios" className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Relatórios
              </Link>
              {syncing && <span className="text-xs text-gray-400 hidden sm:inline">Sincronizando...</span>}
              <button
                onClick={() => runSync(false)}
                disabled={syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  syncing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sync'}</span>
              </button>
              <button onClick={logout} className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Sair">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* SYNC BANNER */}
      {syncResult && (
        <div className={`mx-4 mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
          syncResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {syncResult.message}
          <button onClick={() => setSyncResult(null)} className="float-right font-bold opacity-60 hover:opacity-100">x</button>
        </div>
      )}

      {/* RESUMO BAR */}
      <div className="bg-white border-b px-4 sm:px-6 py-3">
        <div className="max-w-full mx-auto flex gap-4 sm:gap-6 flex-wrap items-center">
          <div>
            <span className="text-2xl font-bold text-gray-900">{resumo.total}</span>
            <span className="text-xs text-gray-500 ml-1">propostas</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-red-600">{fmt(resumo.valorPipeline)}</span>
            <span className="text-xs text-gray-500 ml-1">pipeline</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-green-600">{resumo.ganhos}</span>
            <span className="text-xs text-gray-500 ml-1">ganhos ({fmt(resumo.valorGanho)})</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-gray-700">{resumo.taxa}%</span>
            <span className="text-xs text-gray-500 ml-1">conversão</span>
          </div>
          {ultimoSync && (
            <div className="ml-auto text-xs text-gray-400">
              Sync: {new Date(ultimoSync).toLocaleString('pt-BR')}
            </div>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white border-b shadow-sm px-4 sm:px-6 py-2">
        <div className="max-w-full mx-auto flex gap-3 sm:gap-4 flex-wrap items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Etapa:</label>
            <select value={filtroEstagio} onChange={e => setFiltroEstagio(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500">
              <option value="">Todas</option>
              {estagiosAtivos.map(e => <option key={e.key} value={e.key}>{e.label} ({e.quantidade})</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Prob:</label>
            <select value={filtroProb} onChange={e => setFiltroProb(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500">
              <option value="">Todas</option>
              <option value="alta">Alta (70%+)</option>
              <option value="media">Média (40-69%)</option>
              <option value="baixa">Baixa (&lt;40%)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Ordenar:</label>
            <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-red-500 focus:border-red-500">
              <option value="valor">Maior Valor</option>
              <option value="prob">Maior Probabilidade</option>
              <option value="recente">Mais Recente</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Buscar:</label>
            <input type="text" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
              placeholder="Cliente ou CNPJ"
              className="px-2 py-1 border border-gray-300 rounded text-sm w-40 focus:ring-1 focus:ring-red-500 focus:border-red-500" />
          </div>
        </div>
      </div>

      {/* MAIN: SIDEBAR + CARDS */}
      <div className="flex" style={{ height: 'calc(100vh - 220px)' }}>
        {/* SIDEBAR VENDEDORES */}
        <aside className="w-56 bg-white border-r overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="px-3 py-2.5 font-semibold text-xs text-gray-500 border-b bg-gray-50 uppercase tracking-wide">
            Vendedores
          </div>
          <div
            className={`px-3 py-2.5 border-b cursor-pointer transition hover:bg-gray-50 ${!filtroVendedor ? 'bg-red-50 border-l-[3px] border-l-red-600' : ''}`}
            onClick={() => setFiltroVendedor(null)}
          >
            <div className="font-semibold text-sm">Todos</div>
            <div className="text-xs text-gray-500">{oportunidades.length} propostas</div>
          </div>
          {vendedoresComMetricas.map(v => (
            <div
              key={v.id}
              className={`px-3 py-2.5 border-b cursor-pointer transition hover:bg-gray-50 ${
                filtroVendedor === v.nome ? 'bg-red-50 border-l-[3px] border-l-red-600' : ''
              }`}
              onClick={() => setFiltroVendedor(filtroVendedor === v.nome ? null : v.nome)}
            >
              <div className="font-semibold text-sm truncate">{v.nome}</div>
              <div className="text-xs text-gray-500">
                <span className="text-red-600 font-semibold">{fmt(v.valorAtivo)}</span>
                {' | '}{v.opsAtivas} ativas
              </div>
            </div>
          ))}
        </aside>

        {/* AREA DE PROPOSTAS */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-bold text-gray-800">
              {filtroVendedor || 'Todas as Propostas'}
              <span className="text-gray-400 font-normal ml-2 text-sm">({listaFiltrada.length})</span>
            </h2>
          </div>

          {listaFiltrada.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Nenhuma proposta encontrada</div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {listaFiltrada.map(op => {
                const dias = diasNoFunil(op.created_at);
                const prob = toNum(op.probabilidade);
                const valor = toNum(op.valor_estimado);
                const cfg = ESTAGIO_CONFIG[op.estagio];
                const urgente = toNum(op.atividades_atrasadas) > 0;

                return (
                  <div
                    key={op.id}
                    className={`bg-white rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                      urgente ? 'border-l-4 border-l-red-500' : prob >= 70 ? 'border-l-4 border-l-green-500' : 'border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-400 font-medium">#{op.id} | {dias}d</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${probBg(prob)}`}>
                        {prob}%
                      </span>
                    </div>

                    {/* Cliente */}
                    <div className="font-bold text-gray-900 text-sm mb-1 truncate">{op.cliente_nome}</div>

                    {/* Produto */}
                    <div className="text-xs text-gray-600 mb-2 truncate">{op.tipo_produto || op.titulo}</div>

                    {/* Valor */}
                    <div className="text-xl font-bold text-red-600 mb-2">{fmtFull(valor)}</div>

                    {/* Etapa badge */}
                    {cfg && (
                      <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold text-white mb-2"
                        style={{ background: cfg.corHex }}>
                        {cfg.label}
                      </span>
                    )}

                    {/* Info */}
                    <div className="text-xs text-gray-400">
                      {op.created_at && new Date(op.created_at).toLocaleDateString('pt-BR')}
                    </div>

                    {/* Alertas */}
                    {urgente && (
                      <div className="mt-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                          {op.atividades_atrasadas} atrasada(s)
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t text-xs text-gray-400">
                      <span>{op.vendedor_nome || '-'}</span>
                      <span>{op.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
