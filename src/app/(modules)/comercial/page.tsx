'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ModalDetalheOportunidade } from '@/components/comercial';

interface Oportunidade {
  id: number;
  titulo: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  cliente_cnpj?: string;
  vendedor_nome?: string;
  vendedor_id?: number;
  tipo_produto?: string;
  produto?: string;
  valor_estimado: number;
  probabilidade: number;
  estagio: string;
  status: string;
  numero_proposta?: string;
  data_abertura?: string;
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
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4' },
  EM_NEGOCIACAO: { label: 'Em Negociação', cor: 'bg-orange-500', corHex: '#f97316' },
  POS_NEGOCIACAO: { label: 'Pós Negociação', cor: 'bg-purple-500', corHex: '#a855f7' },
  FECHADA: { label: 'Fechada', cor: 'bg-green-500', corHex: '#22c55e' },
  PERDIDA: { label: 'Perdida', cor: 'bg-red-500', corHex: '#ef4444' },
  TESTE: { label: 'Teste', cor: 'bg-pink-500', corHex: '#ec4899' },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-yellow-600', corHex: '#ca8a04' },
  SUBSTITUIDO: { label: 'Substituído', cor: 'bg-indigo-500', corHex: '#6366f1' },
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
  const [selectedOportunidadeId, setSelectedOportunidadeId] = useState<number | null>(null);
  const [showIA, setShowIA] = useState(false);

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
      // API filtra server-side pelo vendedor do usuário logado
      const opUrl = '/api/comercial/oportunidades?limit=10000';
      const fetches: Promise<Response>[] = [fetch(opUrl)];
      // Só buscar lista de vendedores se for admin (sidebar)
      if (isAdminRef.current) {
        fetches.push(fetch('/api/comercial/vendedores?ativo=true'));
      }
      const responses = await Promise.all(fetches);
      if (responses[0].ok) {
        const opData = await responses[0].json();
        setOportunidades(opData.data || []);
        setPipeline(opData.pipeline || []);
      }
      if (isAdminRef.current && responses[1]?.ok) {
        const vendData = await responses[1].json();
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
    else if (ordenacao === 'proposta') lista.sort((a, b) => parseInt(b.numero_proposta || '0') - parseInt(a.numero_proposta || '0'));
    return lista;
  }, [oportunidades, filtroVendedor, filtroEstagio, filtroProb, filtroBusca, ordenacao]);

  const resumo = useMemo(() => {
    const base = listaFiltrada;
    const ativas = base.filter(o => o.status === 'ABERTA');
    const ganhas = base.filter(o => o.estagio === 'FECHADA');
    const perdidas = base.filter(o => o.estagio === 'PERDIDA');
    return {
      total: base.length,
      ativas: ativas.length,
      valorPipeline: ativas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
      ganhos: ganhas.length,
      valorGanho: ganhas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
      taxa: base.length > 0 ? Math.round((ganhas.length / base.length) * 100) : 0,
    };
  }, [listaFiltrada]);

  // Calcular estágios a partir dos dados filtrados por vendedor (não por estágio)
  const estagiosAtivos = useMemo(() => {
    // Filtrar por vendedor selecionado, mas NÃO por estágio (senão o dropdown fica vazio)
    let base = [...oportunidades];
    if (filtroVendedor) base = base.filter(o => o.vendedor_nome === filtroVendedor);

    // Agrupar por estágio
    const porEstagio: Record<string, { quantidade: number; valor: number }> = {};
    base.forEach(o => {
      if (!porEstagio[o.estagio]) porEstagio[o.estagio] = { quantidade: 0, valor: 0 };
      porEstagio[o.estagio].quantidade++;
      porEstagio[o.estagio].valor += toNum(o.valor_estimado);
    });

    const order: Record<string, number> = { EM_ANALISE: 1, EM_NEGOCIACAO: 2, POS_NEGOCIACAO: 3, FECHADA: 4, PERDIDA: 5, TESTE: 6, SUSPENSO: 7, SUBSTITUIDO: 8 };

    return Object.entries(porEstagio)
      .filter(([, v]) => v.quantidade > 0)
      .map(([key, v]) => ({
        key,
        label: ESTAGIO_CONFIG[key]?.label || key,
        cor: ESTAGIO_CONFIG[key]?.cor || 'bg-gray-500',
        corHex: ESTAGIO_CONFIG[key]?.corHex || '#6b7280',
        quantidade: v.quantidade,
        valor: v.valor,
      }))
      .sort((a, b) => (order[a.key] || 99) - (order[b.key] || 99));
  }, [oportunidades, filtroVendedor]);

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
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10">
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
            <div className="flex items-center gap-1">
              {[
                { href: '/comercial/pipeline', label: 'Kanban' },
                { href: '/comercial/clientes', label: 'Clientes' },
                { href: '/comercial/admin/precos', label: 'Preços' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="hidden sm:inline-block px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => setShowIA(!showIA)}
                className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  showIA ? 'text-purple-700 bg-purple-50' : 'text-gray-500 hover:text-purple-600 hover:bg-gray-50'
                }`}
                title="Assistente IA"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                IA
              </button>
              <button
                onClick={() => runSync(false)}
                disabled={syncing}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                  syncing ? 'text-gray-400 cursor-not-allowed' : 'text-green-700 hover:bg-green-50'
                }`}
              >
                <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">{syncing ? 'Sync...' : 'Sync'}</span>
              </button>
              <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition" title="Sair">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="bg-white border-b px-4 sm:px-6 py-2">
        <div className="max-w-full mx-auto flex gap-6 items-center text-sm">
          <span><strong className="text-gray-900">{resumo.total}</strong> <span className="text-gray-400">propostas</span></span>
          <span><strong className="text-red-600">{fmt(resumo.valorPipeline)}</strong> <span className="text-gray-400">pipeline</span></span>
          <span><strong className="text-green-600">{resumo.ganhos}</strong> <span className="text-gray-400">ganhos ({fmt(resumo.valorGanho)})</span></span>
          <span><strong className="text-gray-700">{resumo.taxa}%</strong> <span className="text-gray-400">conversão</span></span>
          {ultimoSync && (
            <span className="ml-auto text-xs text-gray-300">
              Sync: {new Date(ultimoSync).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white border-b px-4 sm:px-6 py-1.5">
        <div className="max-w-full mx-auto flex gap-3 items-center text-sm">
          {/* Dropdown vendedor - visível no mobile para admin */}
          {isAdmin && (
            <select value={filtroVendedor || ''} onChange={e => setFiltroVendedor(e.target.value || null)}
              className="px-2 py-1 border border-gray-200 rounded text-sm text-gray-600 focus:ring-1 focus:ring-red-500 md:hidden">
              <option value="">Todos vendedores</option>
              {vendedoresComMetricas.map(v => <option key={v.id} value={v.nome}>{v.nome} ({v.opsAtivas})</option>)}
            </select>
          )}
          <select value={filtroEstagio} onChange={e => setFiltroEstagio(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="">Todas etapas</option>
            {estagiosAtivos.map(e => <option key={e.key} value={e.key}>{e.label} ({e.quantidade})</option>)}
          </select>
          <select value={filtroProb} onChange={e => setFiltroProb(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="">Todas prob.</option>
            <option value="alta">Alta (70%+)</option>
            <option value="media">Média (40-69%)</option>
            <option value="baixa">Baixa (&lt;40%)</option>
          </select>
          <select value={ordenacao} onChange={e => setOrdenacao(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="valor">Maior valor</option>
            <option value="proposta"># Proposta</option>
            <option value="prob">Maior prob.</option>
            <option value="recente">Mais recente</option>
          </select>
          <input type="text" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
            placeholder="Buscar cliente ou CNPJ..."
            className="px-2 py-1 border border-gray-200 rounded text-sm w-48 text-gray-600 focus:ring-1 focus:ring-red-500" />
        </div>
      </div>

      {/* MAIN: SIDEBAR + LIST */}
      <div className="flex" style={{ height: 'calc(100vh - 180px)' }}>
        {/* SIDEBAR VENDEDORES - só para admin */}
        {isAdmin && (
          <aside className="w-48 bg-white border-r overflow-y-auto flex-shrink-0 hidden md:block text-sm">
            <div
              className={`px-3 py-2 border-b cursor-pointer transition hover:bg-gray-50 ${!filtroVendedor ? 'bg-red-50 font-semibold text-red-700' : 'text-gray-700'}`}
              onClick={() => setFiltroVendedor(null)}
            >
              Todos <span className="text-gray-400 font-normal">({oportunidades.length})</span>
            </div>
            {vendedoresComMetricas.map(v => (
              <div
                key={v.id}
                className={`px-3 py-2 border-b cursor-pointer transition hover:bg-gray-50 ${
                  filtroVendedor === v.nome ? 'bg-red-50 font-semibold text-red-700' : 'text-gray-700'
                }`}
                onClick={() => setFiltroVendedor(filtroVendedor === v.nome ? null : v.nome)}
              >
                <div className="truncate">{v.nome}</div>
                <div className="text-xs text-gray-400 font-normal">{fmt(v.valorAtivo)} &middot; {v.opsAtivas}</div>
              </div>
            ))}
          </aside>
        )}

        {/* AREA DE PROPOSTAS */}
        <div className="flex-1 overflow-y-auto p-3">

          {listaFiltrada.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Nenhuma proposta encontrada</div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              {/* Table header */}
              <div className={`grid gap-2 px-4 py-2.5 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide ${
                isAdmin ? 'grid-cols-[50px_1fr_80px_110px_60px_95px_100px]' : 'grid-cols-[50px_1fr_80px_110px_60px_95px]'
              }`}>
                <span className="text-center">#</span>
                <span>Cliente / Produto</span>
                <span className="text-center">Data</span>
                <span className="text-right">Valor</span>
                <span className="text-center">Prob.</span>
                <span className="text-center">Etapa</span>
                {isAdmin && <span className="text-right">Vendedor</span>}
              </div>
              {/* Rows */}
              {listaFiltrada.map(op => {
                const prob = toNum(op.probabilidade);
                const valor = toNum(op.valor_estimado);
                const cfg = ESTAGIO_CONFIG[op.estagio];
                const urgente = toNum(op.atividades_atrasadas) > 0;
                const dataRef = op.data_abertura || op.created_at;

                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOportunidadeId(op.id)}
                    className={`grid gap-2 px-4 py-2.5 border-b last:border-b-0 hover:bg-gray-50 transition cursor-pointer items-center ${
                      isAdmin ? 'grid-cols-[50px_1fr_80px_110px_60px_95px_100px]' : 'grid-cols-[50px_1fr_80px_110px_60px_95px]'
                    } ${urgente ? 'bg-red-50/40' : ''}`}
                  >
                    {/* # Proposta */}
                    <div className="text-center text-xs font-mono text-gray-500">
                      {op.numero_proposta || '-'}
                    </div>
                    {/* Cliente + Produto */}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {op.cliente_nome || op.titulo}
                        {urgente && <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-500" title="Atividade atrasada" />}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{op.produto || op.tipo_produto || '-'}</div>
                    </div>
                    {/* Data */}
                    <div className="text-center text-xs text-gray-500">
                      {dataRef ? new Date(dataRef).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                    </div>
                    {/* Valor */}
                    <div className="text-right font-bold text-sm text-gray-800">{fmtFull(valor)}</div>
                    {/* Probabilidade */}
                    <div className="text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${probBg(prob)}`}>
                        {prob}%
                      </span>
                    </div>
                    {/* Etapa */}
                    <div className="text-center">
                      {cfg && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium text-white whitespace-nowrap"
                          style={{ background: cfg.corHex }}>
                          {cfg.label}
                        </span>
                      )}
                    </div>
                    {/* Vendedor - só para admin */}
                    {isAdmin && (
                      <div className="text-right text-xs text-gray-500 truncate">{op.vendedor_nome || '-'}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Detalhe Oportunidade */}
      {selectedOportunidadeId && (
        <ModalDetalheOportunidade
          oportunidadeId={selectedOportunidadeId}
          onClose={() => setSelectedOportunidadeId(null)}
          onSave={() => fetchAll()}
        />
      )}

    </div>
  );
}
