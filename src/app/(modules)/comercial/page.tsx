'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

// ==================== TIPOS ====================

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
  data_previsao_fechamento?: string;
  total_atividades?: number;
  atividades_atrasadas?: number;
  proxima_atividade?: string;
  created_at: string;
  origem?: string;
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

// ==================== CONFIGURAÇÃO ====================

const ESTAGIO_CONFIG: Record<string, { label: string; cor: string; corHex: string; ordem: number }> = {
  EM_NEGOCIACAO: { label: 'Negociação', cor: 'bg-orange-500', corHex: '#f97316', ordem: 1 },
  PROSPECCAO: { label: 'Prospecção', cor: 'bg-blue-500', corHex: '#3b82f6', ordem: 2 },
  FECHADA: { label: 'Fechada', cor: 'bg-green-500', corHex: '#22c55e', ordem: 3 },
  PERDIDA: { label: 'Perdida', cor: 'bg-red-500', corHex: '#ef4444', ordem: 4 },
  TESTE: { label: 'Teste', cor: 'bg-pink-500', corHex: '#ec4899', ordem: 5 },
  SUBSTITUIDO: { label: 'Substituído', cor: 'bg-indigo-500', corHex: '#6366f1', ordem: 6 },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-yellow-600', corHex: '#ca8a04', ordem: 7 },
  PROPOSTA: { label: 'Proposta', cor: 'bg-purple-500', corHex: '#a855f7', ordem: 8 },
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4', ordem: 9 },
  QUALIFICACAO: { label: 'Qualificação', cor: 'bg-teal-500', corHex: '#14b8a6', ordem: 10 },
};

const AUTO_SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutos

// ==================== COMPONENTE PRINCIPAL ====================

export default function ComercialPage() {
  // Estado
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEstagio[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [ultimoSync, setUltimoSync] = useState<string | null>(null);
  const syncTriggered = useRef(false);

  // Filtros
  const [filtroVendedor, setFiltroVendedor] = useState<string | null>(null);
  const [filtroEstagio, setFiltroEstagio] = useState<string>('');
  const [filtroProb, setFiltroProb] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<string>('prob');

  const router = useRouter();
  const { user, authenticated, loading: authLoading, logout } = useAuth();

  // ==================== FETCH ====================

  const fetchAll = useCallback(async () => {
    try {
      const [opRes, vendRes] = await Promise.all([
        fetch('/api/comercial/oportunidades?limit=2000'),
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
      if (!silent) {
        setSyncResult({ message: 'Erro de conexão ao sincronizar', type: 'error' });
      }
    } finally {
      setSyncing(false);
    }
  }, [fetchAll, fetchSyncStatus]);

  // Init
  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }

    const init = async () => {
      const [, lastSync] = await Promise.all([fetchAll(), fetchSyncStatus()]);
      if (!syncTriggered.current) {
        syncTriggered.current = true;
        const needsSync = !lastSync || (Date.now() - new Date(lastSync).getTime() > AUTO_SYNC_INTERVAL);
        if (needsSync) {
          runSync(true);
        }
      }
    };

    init();
  }, [authLoading, authenticated, router, fetchAll, fetchSyncStatus, runSync]);

  // ==================== FILTROS & RESUMO ====================

  const listaFiltrada = useMemo(() => {
    let lista = [...oportunidades];

    if (filtroVendedor) {
      lista = lista.filter(o => o.vendedor_nome === filtroVendedor);
    }
    if (filtroEstagio) {
      lista = lista.filter(o => o.estagio === filtroEstagio);
    }
    if (filtroProb === 'alta') lista = lista.filter(o => o.probabilidade >= 70);
    else if (filtroProb === 'media') lista = lista.filter(o => o.probabilidade >= 40 && o.probabilidade < 70);
    else if (filtroProb === 'baixa') lista = lista.filter(o => o.probabilidade < 40);

    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      lista = lista.filter(o =>
        (o.cliente_nome || '').toLowerCase().includes(busca) ||
        (o.titulo || '').toLowerCase().includes(busca) ||
        (o.cliente_cnpj || '').includes(busca)
      );
    }

    // Ordenação
    if (ordenacao === 'prob') lista.sort((a, b) => b.probabilidade - a.probabilidade);
    else if (ordenacao === 'valor') lista.sort((a, b) => b.valor_estimado - a.valor_estimado);
    else if (ordenacao === 'recente') lista.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return lista;
  }, [oportunidades, filtroVendedor, filtroEstagio, filtroProb, filtroBusca, ordenacao]);

  const resumo = useMemo(() => {
    const ativas = oportunidades.filter(o => o.status === 'ABERTA');
    const ganhas = oportunidades.filter(o => o.estagio === 'FECHADA');
    const perdidas = oportunidades.filter(o => o.estagio === 'PERDIDA');
    const totalDecididas = ganhas.length + perdidas.length;
    const taxa = totalDecididas > 0 ? Math.round((ganhas.length / totalDecididas) * 100) : 0;
    const valorPipeline = ativas.reduce((s, o) => s + (o.valor_estimado || 0), 0);
    const valorGanho = ganhas.reduce((s, o) => s + (o.valor_estimado || 0), 0);

    return {
      total: oportunidades.length,
      ativas: ativas.length,
      valorPipeline,
      ganhos: ganhas.length,
      valorGanho,
      taxa,
    };
  }, [oportunidades]);

  // Estágios dinâmicos (só os que existem nos dados)
  const estagiosAtivos = useMemo(() => {
    return pipeline
      .filter(p => parseInt(String(p.quantidade)) > 0)
      .map(p => {
        const config = ESTAGIO_CONFIG[p.estagio] || { label: p.estagio, cor: 'bg-gray-500', corHex: '#6b7280', ordem: 99 };
        return {
          key: p.estagio,
          label: config.label,
          cor: config.cor,
          corHex: config.corHex,
          quantidade: parseInt(String(p.quantidade)) || 0,
          valor: parseFloat(String(p.valor_total)) || 0,
        };
      })
      .sort((a, b) => (ESTAGIO_CONFIG[a.key]?.ordem || 99) - (ESTAGIO_CONFIG[b.key]?.ordem || 99));
  }, [pipeline]);

  // Vendedores com métricas de oportunidades
  const vendedoresComMetricas = useMemo(() => {
    return vendedores.map(v => {
      const ops = oportunidades.filter(o => o.vendedor_nome === v.nome);
      const ativas = ops.filter(o => o.status === 'ABERTA');
      const valor = ativas.reduce((s, o) => s + (o.valor_estimado || 0), 0);
      return { ...v, opsAtivas: ativas.length, opsTotal: ops.length, valorAtivo: valor };
    }).sort((a, b) => b.valorAtivo - a.valorAtivo);
  }, [vendedores, oportunidades]);

  // ==================== HELPERS ====================

  const fmt = (value: number) => {
    if (value >= 1000000) return 'R$ ' + (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return 'R$ ' + (value / 1000).toFixed(0) + 'k';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const fmtFull = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  const diasNoFunil = (createdAt: string) => {
    const diff = Date.now() - new Date(createdAt).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getProbColor = (prob: number) => {
    if (prob >= 70) return { bg: '#dcfce7', text: '#166534' };
    if (prob >= 40) return { bg: '#fef3c7', text: '#92400e' };
    return { bg: '#fee2e2', text: '#991b1b' };
  };

  // ==================== LOADING ====================

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-[#4361ee] mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm">Carregando pipeline...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-[#333] text-[13px]">
      {/* ===== HEADER ===== */}
      <header className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white px-5 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white/70 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-[16px] font-semibold">CRM PILI - Pipeline Comercial</h1>
        </div>
        <div className="flex items-center gap-2">
          {syncing && <span className="text-xs text-white/60">Sincronizando...</span>}
          <button
            onClick={() => runSync(false)}
            disabled={syncing}
            className="px-3 py-[7px] rounded-[5px] text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
          >
            <span className={syncing ? 'animate-spin inline-block' : ''}>&#x21BB;</span> Sincronizar
          </button>
          <button
            onClick={logout}
            className="px-3 py-[7px] rounded-[5px] text-xs font-medium bg-white/10 text-white hover:bg-white/20 transition"
            title="Sair"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Sync banner */}
      {syncResult && (
        <div className={`mx-5 mt-3 px-4 py-2 rounded-lg text-xs font-medium ${
          syncResult.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {syncResult.message}
          <button onClick={() => setSyncResult(null)} className="float-right font-bold opacity-60 hover:opacity-100 ml-2">x</button>
        </div>
      )}

      {/* ===== RESUMO BAR ===== */}
      <div className="flex gap-5 px-5 py-3 bg-white border-b border-[#e0e0e0] flex-wrap">
        <div className="flex items-center gap-[6px]">
          <span className="font-bold text-[16px]">{resumo.total}</span>
          <span className="text-[11px] text-[#888]">propostas</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="font-bold text-[16px] text-[#4361ee]">{fmt(resumo.valorPipeline)}</span>
          <span className="text-[11px] text-[#888]">pipeline</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="font-bold text-[16px] text-[#16a34a]">{resumo.ganhos}</span>
          <span className="text-[11px] text-[#888]">ganhos</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="font-bold text-[16px]">{resumo.taxa}%</span>
          <span className="text-[11px] text-[#888]">conversão</span>
        </div>
        {ultimoSync && (
          <div className="ml-auto text-[11px] text-[#aaa]">
            Sync: {new Date(ultimoSync).toLocaleString('pt-BR')}
          </div>
        )}
      </div>

      {/* ===== FILTROS ===== */}
      <div className="flex gap-4 px-5 py-3 bg-white border-b border-[#e0e0e0] flex-wrap items-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-[6px]">
          <label className="text-[11px] text-[#666] font-medium">Etapa:</label>
          <select
            value={filtroEstagio}
            onChange={e => setFiltroEstagio(e.target.value)}
            className="px-[10px] py-[6px] border border-[#ddd] rounded text-xs"
          >
            <option value="">Todas</option>
            {estagiosAtivos.map(e => (
              <option key={e.key} value={e.key}>{e.label} ({e.quantidade})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-[6px]">
          <label className="text-[11px] text-[#666] font-medium">Prob:</label>
          <select
            value={filtroProb}
            onChange={e => setFiltroProb(e.target.value)}
            className="px-[10px] py-[6px] border border-[#ddd] rounded text-xs"
          >
            <option value="">Todas</option>
            <option value="alta">Alta (70%+)</option>
            <option value="media">Média (40-69%)</option>
            <option value="baixa">Baixa (&lt;40%)</option>
          </select>
        </div>
        <div className="flex items-center gap-[6px]">
          <label className="text-[11px] text-[#666] font-medium">Ordenar:</label>
          <select
            value={ordenacao}
            onChange={e => setOrdenacao(e.target.value)}
            className="px-[10px] py-[6px] border border-[#ddd] rounded text-xs"
          >
            <option value="prob">Maior Probabilidade</option>
            <option value="valor">Maior Valor</option>
            <option value="recente">Mais Recente</option>
          </select>
        </div>
        <div className="flex items-center gap-[6px]">
          <label className="text-[11px] text-[#666] font-medium">Buscar:</label>
          <input
            type="text"
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            placeholder="Cliente ou CNPJ"
            className="px-[10px] py-[6px] border border-[#ddd] rounded text-xs w-40"
          />
        </div>
      </div>

      {/* ===== MAIN: SIDEBAR + CARDS ===== */}
      <div className="flex" style={{ height: 'calc(100vh - 200px)' }}>
        {/* SIDEBAR VENDEDORES */}
        <aside className="w-60 bg-white border-r border-[#e0e0e0] overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="px-4 py-3 font-semibold text-xs text-[#666] border-b border-[#eee] bg-[#fafafa]">
            VENDEDORES
          </div>
          {/* Todos */}
          <div
            className={`px-4 py-3 border-b border-[#f0f0f0] cursor-pointer transition hover:bg-[#f5f7fa] ${
              !filtroVendedor ? 'bg-[#e8f0fe] border-l-[3px] border-l-[#4361ee]' : ''
            }`}
            onClick={() => setFiltroVendedor(null)}
          >
            <div className="font-semibold text-[13px]">Todos</div>
            <div className="text-[11px] text-[#888]">
              {oportunidades.length} propostas
            </div>
          </div>
          {vendedoresComMetricas.map(v => (
            <div
              key={v.id}
              className={`px-4 py-3 border-b border-[#f0f0f0] cursor-pointer transition hover:bg-[#f5f7fa] ${
                filtroVendedor === v.nome ? 'bg-[#e8f0fe] border-l-[3px] border-l-[#4361ee]' : ''
              }`}
              onClick={() => setFiltroVendedor(filtroVendedor === v.nome ? null : v.nome)}
            >
              <div className="font-semibold text-[13px] truncate">{v.nome}</div>
              <div className="text-[11px] text-[#888]">
                <span className="text-[#4361ee] font-semibold">{fmt(v.valorAtivo)}</span>
                {' | '}{v.opsAtivas} ativas
              </div>
            </div>
          ))}
        </aside>

        {/* AREA DE PROPOSTAS */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Header da área */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-semibold">
              {filtroVendedor || 'Todas as Propostas'}
              <span className="text-[#888] font-normal ml-2 text-[13px]">({listaFiltrada.length})</span>
            </h2>
          </div>

          {/* GRID DE CARDS */}
          {listaFiltrada.length === 0 ? (
            <div className="text-center py-10 text-[#888]">
              Nenhuma proposta encontrada
            </div>
          ) : (
            <div className="grid gap-[14px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
              {listaFiltrada.map(op => {
                const dias = diasNoFunil(op.created_at);
                const probColor = getProbColor(op.probabilidade);
                const estagioConfig = ESTAGIO_CONFIG[op.estagio];
                const isUrgente = (op.atividades_atrasadas || 0) > 0;
                const altaProb = op.probabilidade >= 70;

                return (
                  <Link
                    key={op.id}
                    href={`/comercial/pipeline?estagio=${op.estagio}`}
                    className={`bg-white rounded-xl p-4 border border-[#e8e8e8] transition-all duration-200 hover:shadow-lg hover:-translate-y-[3px] relative ${
                      isUrgente ? 'border-l-4 border-l-[#e74c3c]' : altaProb ? 'border-l-4 border-l-[#27ae60]' : ''
                    }`}
                  >
                    {/* Header: número + probabilidade */}
                    <div className="flex justify-between items-start mb-[10px]">
                      <span className="text-[11px] text-[#888] font-medium">
                        #{op.id} | {dias}d no funil
                      </span>
                      <span
                        className="px-[10px] py-1 rounded-[14px] text-[11px] font-bold shadow-sm"
                        style={{ background: probColor.bg, color: probColor.text }}
                      >
                        {op.probabilidade}%
                      </span>
                    </div>

                    {/* Cliente */}
                    <div className="font-semibold text-[15px] mb-[6px] truncate">
                      {op.cliente_nome}
                    </div>

                    {/* Produto */}
                    <div className="text-[13px] text-[#1a1a2e] font-semibold mb-1 leading-tight">
                      {op.tipo_produto || op.titulo}
                    </div>

                    {/* Valor */}
                    <div className="text-[20px] font-bold text-[#4361ee] mb-[10px]">
                      {fmtFull(op.valor_estimado)}
                    </div>

                    {/* Etapa badge */}
                    {estagioConfig && (
                      <span
                        className="inline-block px-3 py-1 rounded-[5px] text-[10px] font-semibold text-white mb-[10px]"
                        style={{ background: estagioConfig.corHex }}
                      >
                        {estagioConfig.label}
                      </span>
                    )}

                    {/* Info */}
                    <div className="text-[11px] text-[#666] mb-[6px]">
                      {op.tipo_produto && <span className="mr-3">{op.tipo_produto}</span>}
                      {op.created_at && <span>{new Date(op.created_at).toLocaleDateString('pt-BR')}</span>}
                    </div>

                    {/* Alertas */}
                    {isUrgente && (
                      <div className="flex flex-wrap gap-[5px] mt-[10px]">
                        <span className="px-2 py-[3px] rounded text-[9px] font-semibold bg-[#fee2e2] text-[#b91c1c]">
                          {op.atividades_atrasadas} ATRASADA(S)
                        </span>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#f0f0f0]">
                      <span className="text-[11px] text-[#888]">{op.vendedor_nome || '-'}</span>
                      <span className="text-[10px] text-[#888]">{op.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
