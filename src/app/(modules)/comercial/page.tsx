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
  produto?: string;
  valor_estimado: number;
  probabilidade: number;
  probabilidade_smart?: number;
  prob_fatores?: { estagio: number; vendedor: number; aging: number; concorrente: number; atividade: number; valor: number; recencia: number };
  estagio: string;
  status: string;
  numero_proposta?: string;
  data_abertura?: string;
  data_previsao_fechamento?: string;
  dias_no_estagio?: number;
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

const ESTAGIO_CONFIG: Record<string, { label: string; tag: string; cor: string; corHex: string }> = {
  EM_ANALISE: { label: 'Em Análise', tag: 'Análise', cor: 'bg-cyan-500', corHex: '#06b6d4' },
  EM_NEGOCIACAO: { label: 'Em Negociação', tag: 'Negociação', cor: 'bg-orange-500', corHex: '#f97316' },
  POS_NEGOCIACAO: { label: 'Pós Negociação', tag: 'Pós Neg.', cor: 'bg-purple-500', corHex: '#a855f7' },
  FECHADA: { label: 'Fechada', tag: 'Fechada', cor: 'bg-green-500', corHex: '#22c55e' },
  PERDIDA: { label: 'Perdida', tag: 'Perdida', cor: 'bg-red-500', corHex: '#ef4444' },
  TESTE: { label: 'Teste', tag: 'Teste', cor: 'bg-pink-500', corHex: '#ec4899' },
  SUSPENSO: { label: 'Suspenso', tag: 'Suspenso', cor: 'bg-yellow-600', corHex: '#ca8a04' },
  SUBSTITUIDO: { label: 'Substituído', tag: 'Subst.', cor: 'bg-indigo-500', corHex: '#6366f1' },
};

const AUTO_SYNC_INTERVAL = 60 * 60 * 1000; // 60 minutos

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
  const [sortConfig, setSortConfig] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'valor', direcao: 'desc' });
  const [selectedOportunidadeId, setSelectedOportunidadeId] = useState<number | null>(null);
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sendingStatusCheck, setSendingStatusCheck] = useState(false);

  // Reset selection when vendedor filter changes
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [filtroVendedor]);

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

  // Data loading + periodic auto-sync every 60 min
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
    // Periodic sync every 60 minutes
    const interval = setInterval(() => { runSync(true); }, AUTO_SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [authLoading, authenticated, user, fetchAll, fetchSyncStatus, runSync]);

  // ==================== COMPUTED ====================

  const listaFiltrada = useMemo(() => {
    let lista = [...oportunidades];
    if (filtroVendedor) lista = lista.filter(o => o.vendedor_nome === filtroVendedor);
    if (filtroEstagio) lista = lista.filter(o => o.estagio === filtroEstagio);
    if (filtroProb === 'alta') lista = lista.filter(o => toNum(o.probabilidade_smart) >= 50);
    else if (filtroProb === 'media') lista = lista.filter(o => toNum(o.probabilidade_smart) >= 25 && toNum(o.probabilidade_smart) < 50);
    else if (filtroProb === 'baixa') lista = lista.filter(o => toNum(o.probabilidade_smart) < 25);
    if (filtroBusca) {
      const b = filtroBusca.toLowerCase();
      lista = lista.filter(o =>
        (o.cliente_nome || '').toLowerCase().includes(b) ||
        (o.titulo || '').toLowerCase().includes(b) ||
        (o.cliente_cnpj || '').includes(b)
      );
    }
    if (filtroDataInicio) {
      const inicio = new Date(filtroDataInicio);
      lista = lista.filter(o => new Date(o.data_abertura || o.created_at) >= inicio);
    }
    if (filtroDataFim) {
      const fim = new Date(filtroDataFim + 'T23:59:59');
      lista = lista.filter(o => new Date(o.data_abertura || o.created_at) <= fim);
    }
    // Sorting por coluna clicável
    const ESTAGIO_ORDER: Record<string, number> = { EM_ANALISE: 1, EM_NEGOCIACAO: 2, POS_NEGOCIACAO: 3, FECHADA: 4, PERDIDA: 5, TESTE: 6, SUSPENSO: 7, SUBSTITUIDO: 8 };
    const dir = sortConfig.direcao === 'asc' ? 1 : -1;
    lista.sort((a, b) => {
      let cmp = 0;
      switch (sortConfig.campo) {
        case 'proposta':
          cmp = parseInt(a.numero_proposta || '0') - parseInt(b.numero_proposta || '0');
          break;
        case 'cliente':
          cmp = (a.cliente_nome || '').localeCompare(b.cliente_nome || '', 'pt-BR');
          break;
        case 'valor':
          cmp = toNum(a.valor_estimado) - toNum(b.valor_estimado);
          break;
        case 'prob':
          cmp = toNum(a.probabilidade_smart) - toNum(b.probabilidade_smart);
          break;
        case 'estagio':
          cmp = (ESTAGIO_ORDER[a.estagio] || 99) - (ESTAGIO_ORDER[b.estagio] || 99);
          break;
        case 'dias':
          cmp = toNum(a.dias_no_estagio) - toNum(b.dias_no_estagio);
          break;
        case 'vendedor':
          cmp = (a.vendedor_nome || '').localeCompare(b.vendedor_nome || '', 'pt-BR');
          break;
        case 'data':
          cmp = new Date(a.data_abertura || a.created_at).getTime() - new Date(b.data_abertura || b.created_at).getTime();
          break;
        default:
          cmp = toNum(a.valor_estimado) - toNum(b.valor_estimado);
      }
      return cmp * dir;
    });
    return lista;
  }, [oportunidades, filtroVendedor, filtroEstagio, filtroProb, filtroBusca, filtroDataInicio, filtroDataFim, sortConfig]);

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
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [vendedores, oportunidades]);

  // ==================== HELPERS ====================

  const fmt = (v: number) => {
    if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return 'R$ ' + Math.round(v / 1000) + 'k';
    return 'R$ ' + v.toLocaleString('pt-BR');
  };

  const fmtFull = (v: unknown) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toNum(v));
  };

  const diasNoFunil = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  const probBg = (p: number) => {
    if (p >= 50) return 'bg-green-100 text-green-800';
    if (p >= 25) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const abrevNome = (nome: string) => {
    if (!nome) return '-';
    const p = nome.trim().split(/\s+/);
    if (p.length <= 1) return nome;
    return `${p[0]} ${p[p.length - 1][0]}.`;
  };

  // ==================== STATUS CHECK ====================

  const emNegociacaoIds = useMemo(() => {
    return new Set(listaFiltrada.filter(o => o.estagio === 'EM_NEGOCIACAO').map(o => o.id));
  }, [listaFiltrada]);

  const toggleSelectAll = () => {
    if (selectedIds.size === emNegociacaoIds.size && emNegociacaoIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emNegociacaoIds));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleEnviarStatusCheck = async () => {
    if (selectedIds.size === 0 || !filtroVendedor) return;
    const vendedor = vendedoresComMetricas.find(v => v.nome === filtroVendedor);
    if (!vendedor) {
      alert('Vendedor não encontrado');
      return;
    }
    setSendingStatusCheck(true);
    try {
      const res = await fetch('/api/comercial/status-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor_id: vendedor.id,
          oportunidade_ids: Array.from(selectedIds),
        }),
      });
      const json = await res.json();
      if (json.success) {
        const debugInfo = json.debug?.telefone ? ` (tel: ${json.debug.telefone})` : '';
        setSyncResult({
          message: (json.message || 'Status check enviado com sucesso!') + debugInfo,
          type: json.parcial ? 'error' : 'success',
        });
        cancelSelection();
      } else {
        const debugInfo = json.debug?.telefone ? ` | Tel: ${json.debug.telefone}` : '';
        setSyncResult({
          message: (json.error || 'Erro ao enviar status check') + debugInfo,
          type: 'error',
        });
        if (json.link) {
          cancelSelection();
        }
      }
    } catch {
      alert('Erro de conexão');
    } finally {
      setSendingStatusCheck(false);
    }
  };

  const handleSort = (campo: string) => {
    setSortConfig(prev =>
      prev.campo === campo
        ? { campo, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
        : { campo, direcao: campo === 'cliente' || campo === 'vendedor' ? 'asc' : 'desc' }
    );
  };

  const SortArrow = ({ campo }: { campo: string }) => {
    if (sortConfig.campo !== campo) return <span className="text-gray-300 ml-0.5">&#8597;</span>;
    return <span className="text-red-500 ml-0.5">{sortConfig.direcao === 'asc' ? '\u25B2' : '\u25BC'}</span>;
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
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Pipeline</h1>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/comercial/dashboard" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                Dashboard
              </Link>
              <Link href="/comercial/pipeline" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" /></svg>
                Kanban
              </Link>
              <Link href="/comercial/clientes" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Clientes
              </Link>
              <Link href="/comercial/admin/precos" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Preços
              </Link>
              <Link href="/comercial/configurador" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Orçamento
              </Link>
              <Link href="/comercial/materiais" className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                Materiais
              </Link>
              <button
                onClick={() => runSync(false)}
                disabled={syncing}
                className={`flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-lg transition ${
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
        <div className={`mx-2 sm:mx-4 mt-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
          syncResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {syncResult.message}
          <button onClick={() => setSyncResult(null)} className="float-right font-bold opacity-60 hover:opacity-100">x</button>
        </div>
      )}

      {/* RESUMO + FILTROS - merged into one bar */}
      <div className="bg-white border-b px-2 sm:px-4 py-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
          {/* KPIs */}
          <span><strong className="text-gray-900">{resumo.total}</strong> <span className="text-gray-400 hidden sm:inline">propostas</span></span>
          <span><strong className="text-red-600">{fmt(resumo.valorPipeline)}</strong> <span className="text-gray-400 hidden sm:inline">pipeline</span></span>
          <span><strong className="text-green-600">{resumo.ganhos}</strong> <span className="text-gray-400 hidden sm:inline">ganhos</span></span>
          <span><strong className="text-gray-700">{resumo.taxa}%</strong> <span className="text-gray-400 hidden sm:inline">conv.</span></span>

          {/* Separator */}
          <span className="hidden md:inline text-gray-200">|</span>

          {/* Filters */}
          {isAdmin && (
            <select value={filtroVendedor || ''} onChange={e => setFiltroVendedor(e.target.value || null)}
              className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500 md:hidden">
              <option value="">Vendedores</option>
              {vendedoresComMetricas.map(v => <option key={v.id} value={v.nome}>{v.nome} ({v.opsAtivas})</option>)}
            </select>
          )}
          <select value={filtroEstagio} onChange={e => setFiltroEstagio(e.target.value)}
            className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="">Etapas</option>
            {estagiosAtivos.map(e => <option key={e.key} value={e.key}>{e.label} ({e.quantidade})</option>)}
          </select>
          <select value={filtroProb} onChange={e => setFiltroProb(e.target.value)}
            className="hidden sm:inline px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm text-gray-600 focus:ring-1 focus:ring-red-500">
            <option value="">Prob.</option>
            <option value="alta">Alta 50%+</option>
            <option value="media">Media 25-49%</option>
            <option value="baixa">Baixa &lt;25%</option>
          </select>
          <input type="text" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)}
            placeholder="Buscar..."
            className="px-1.5 py-0.5 border border-gray-200 rounded text-xs sm:text-sm w-28 sm:w-40 text-gray-600 focus:ring-1 focus:ring-red-500" />
          <div className="hidden sm:flex items-center gap-1">
            <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
              className="px-1 py-0.5 border border-gray-200 rounded text-xs text-gray-600 focus:ring-1 focus:ring-red-500" />
            <span className="text-gray-300 text-xs">a</span>
            <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
              className="px-1 py-0.5 border border-gray-200 rounded text-xs text-gray-600 focus:ring-1 focus:ring-red-500" />
            {(filtroDataInicio || filtroDataFim) && (
              <button onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}
                className="text-gray-400 hover:text-red-500 text-xs font-bold">x</button>
            )}
          </div>

          {/* Solicitar Status - admin + vendedor selecionado */}
          {isAdmin && filtroVendedor && !selectionMode && (
            <button
              onClick={() => { setSelectionMode(true); setFiltroEstagio('EM_NEGOCIACAO'); }}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition"
              title="Solicitar atualização de status via WhatsApp"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Solicitar Status
            </button>
          )}
          {selectionMode && (
            <button
              onClick={cancelSelection}
              className="ml-auto flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar Seleção
            </button>
          )}
          {ultimoSync && !selectionMode && !(isAdmin && filtroVendedor) && (
            <span className="ml-auto text-[10px] text-gray-300 hidden lg:inline">
              Sync: {new Date(ultimoSync).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* MAIN: SIDEBAR + LIST */}
      <div className="flex flex-1">
        {/* SIDEBAR VENDEDORES - admin desktop only */}
        {isAdmin && (
          <aside className="w-40 lg:w-48 bg-white border-r flex-shrink-0 hidden md:block text-sm sticky top-[calc(3.5rem+37px)] self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div
              className={`px-3 py-1.5 border-b cursor-pointer transition hover:bg-gray-50 ${!filtroVendedor ? 'bg-red-50 font-semibold text-red-700' : 'text-gray-700'}`}
              onClick={() => setFiltroVendedor(null)}
            >
              Todos <span className="text-gray-400 font-normal">({oportunidades.length})</span>
            </div>
            {vendedoresComMetricas.map(v => (
              <div
                key={v.id}
                className={`px-3 py-1.5 border-b cursor-pointer transition hover:bg-gray-50 ${
                  filtroVendedor === v.nome ? 'bg-red-50 font-semibold text-red-700' : 'text-gray-700'
                }`}
                onClick={() => setFiltroVendedor(filtroVendedor === v.nome ? null : v.nome)}
              >
                <div className="truncate text-xs" title={v.nome}>{v.nome}</div>
                <div className="text-[10px] text-gray-400 font-normal">{fmt(v.valorAtivo)} · {v.opsAtivas}</div>
              </div>
            ))}
          </aside>
        )}

        {/* AREA DE PROPOSTAS */}
        <div className={`flex-1 p-2 sm:p-3 min-w-0 ${selectionMode && selectedIds.size > 0 ? 'pb-20' : ''}`}>

          {listaFiltrada.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Nenhuma proposta encontrada</div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide select-none">
                    {selectionMode && (
                      <th className="px-1 py-2 text-center w-[32px]">
                        <input
                          type="checkbox"
                          checked={emNegociacaoIds.size > 0 && selectedIds.size === emNegociacaoIds.size}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-2 py-2 text-center w-[36px] hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('proposta')}># <SortArrow campo="proposta" /></th>
                    <th className="px-2 py-2 text-left w-[40%] cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('cliente')}>Cliente <SortArrow campo="cliente" /></th>
                    <th className="px-2 py-2 text-right w-[100px] cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('valor')}>Valor <SortArrow campo="valor" /></th>
                    <th className="px-2 py-2 text-center w-[44px] hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('prob')}>Prob <SortArrow campo="prob" /></th>
                    <th className="px-2 py-2 text-center w-[90px] cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('estagio')}>Etapa <SortArrow campo="estagio" /></th>
                    <th className="px-2 py-2 text-center w-[44px] hidden lg:table-cell cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('dias')}>Dias <SortArrow campo="dias" /></th>
                    {isAdmin && <th className="px-2 py-2 text-left w-[140px] hidden sm:table-cell cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('vendedor')}>Vendedor <SortArrow campo="vendedor" /></th>}
                    <th className="px-2 py-2 text-center w-[76px] hidden lg:table-cell cursor-pointer hover:bg-gray-100 transition" onClick={() => handleSort('data')}>Data <SortArrow campo="data" /></th>
                  </tr>
                </thead>
                <tbody>
                  {listaFiltrada.map((op, idx) => {
                    const prob = toNum(op.probabilidade_smart);
                    const valor = toNum(op.valor_estimado);
                    const cfg = ESTAGIO_CONFIG[op.estagio];
                    const urgente = toNum(op.atividades_atrasadas) > 0;
                    const dataRef = op.data_abertura || op.created_at;
                    const over60 = dataRef ? diasNoFunil(dataRef) > 60 : false;
                    const isEmNeg = op.estagio === 'EM_NEGOCIACAO';

                    return (
                      <tr
                        key={op.id}
                        onClick={() => setSelectedOportunidadeId(op.id)}
                        className={`border-b last:border-b-0 hover:bg-blue-50/60 transition cursor-pointer ${
                          over60 ? 'border-l-4 border-l-amber-400' : ''
                        } ${urgente ? 'bg-red-50/50' : idx % 2 === 1 ? 'bg-gray-50/60' : ''}`}
                      >
                        {selectionMode && (
                          <td className="px-1 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                            {isEmNeg ? (
                              <input
                                type="checkbox"
                                checked={selectedIds.has(op.id)}
                                onChange={() => toggleSelect(op.id)}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                            ) : (
                              <span className="inline-block w-3.5 h-3.5" />
                            )}
                          </td>
                        )}
                        <td className="px-2 py-1.5 text-center text-[10px] font-mono text-gray-400 hidden sm:table-cell">
                          {op.numero_proposta || '-'}
                        </td>
                        <td className="px-2 py-1.5 max-w-0">
                          <div className="font-semibold text-gray-900 text-xs sm:text-sm truncate">
                            {op.cliente_nome || op.titulo}
                            {urgente && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-red-500" title="Atividade atrasada" />}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate">{op.produto || '-'}</div>
                        </td>
                        <td className="px-2 py-1.5 text-right font-bold text-xs sm:text-sm text-gray-800 tabular-nums whitespace-nowrap">{fmtFull(valor)}</td>
                        <td className="px-2 py-1.5 text-center hidden sm:table-cell"
                          title={op.prob_fatores ? `Estágio: ${op.prob_fatores.estagio}pts\nVendedor: ${op.prob_fatores.vendedor}pts\nAging: ${op.prob_fatores.aging}pts\nConcorrente: ${op.prob_fatores.concorrente}pts\nAtividade: ${op.prob_fatores.atividade}pts\nValor: ${op.prob_fatores.valor}pts\nRecência: ${op.prob_fatores.recencia}pts` : ''}
                        >
                          <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-bold ${probBg(prob)}`}>
                            {prob}%
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          {cfg && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap"
                              style={{ background: cfg.corHex }}>
                              {cfg.tag}
                            </span>
                          )}
                        </td>
                        <td className={`px-2 py-1.5 text-center text-[11px] tabular-nums hidden lg:table-cell ${over60 ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                          {dataRef ? `${diasNoFunil(dataRef)}d` : '-'}
                        </td>
                        {isAdmin && (
                          <td className="px-2 py-1.5 text-xs text-gray-500 max-w-[160px] hidden sm:table-cell">
                            <span className="block truncate" title={op.vendedor_nome || ''}>{op.vendedor_nome || '-'}</span>
                          </td>
                        )}
                        <td className="px-2 py-1.5 text-center text-[11px] text-gray-400 tabular-nums hidden lg:table-cell">
                          {dataRef ? new Date(dataRef).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Floating Status Check Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size} proposta{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelSelection}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleEnviarStatusCheck}
                disabled={sendingStatusCheck}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition ${
                  sendingStatusCheck ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {sendingStatusCheck ? 'Enviando...' : 'Enviar via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

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
