'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Oportunidade {
  id: number;
  titulo: string;
  cliente_nome: string;
  cliente_fantasia?: string;
  vendedor_nome?: string;
  vendedor_id?: number;
  produto?: string;
  valor_estimado: number;
  probabilidade: number;
  estagio: string;
  status: string;
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

interface Atividade {
  id: number;
  titulo: string;
  tipo: string;
  data_agendada?: string;
  oportunidade_titulo?: string;
  cliente_nome?: string;
  concluida: boolean;
  status?: string;
}

interface AtividadeTotais {
  pendentes: number;
  concluidas: number;
  atrasadas: number;
  proxima_semana: number;
}

const ESTAGIO_CONFIG: Record<string, { label: string; cor: string; corHex: string; ordem: number }> = {
  EM_ANALISE: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4', ordem: 1 },
  PROSPECCAO: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4', ordem: 1 },
  QUALIFICACAO: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4', ordem: 1 },
  PROPOSTA: { label: 'Em Análise', cor: 'bg-cyan-500', corHex: '#06b6d4', ordem: 1 },
  EM_NEGOCIACAO: { label: 'Negociação', cor: 'bg-orange-500', corHex: '#f97316', ordem: 2 },
  POS_NEGOCIACAO: { label: 'Pós Negociação', cor: 'bg-purple-500', corHex: '#a855f7', ordem: 3 },
  FECHADA: { label: 'Fechada', cor: 'bg-green-500', corHex: '#22c55e', ordem: 4 },
  PERDIDA: { label: 'Perdida', cor: 'bg-red-500', corHex: '#ef4444', ordem: 5 },
  TESTE: { label: 'Teste', cor: 'bg-pink-500', corHex: '#ec4899', ordem: 6 },
  SUSPENSO: { label: 'Suspenso', cor: 'bg-yellow-600', corHex: '#ca8a04', ordem: 7 },
  SUBSTITUIDO: { label: 'Substituído', cor: 'bg-indigo-500', corHex: '#6366f1', ordem: 8 },
};

// Normalize legacy stages
function normalizeEstagio(estagio: string): string {
  if (['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA'].includes(estagio)) return 'EM_ANALISE';
  return estagio;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

function fmtCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function fmtShort(v: number): string {
  if (v >= 1_000_000) return 'R$ ' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return 'R$ ' + (v / 1_000).toFixed(0) + 'k';
  return 'R$ ' + v.toFixed(0);
}

export default function DashboardComercialPage() {
  const router = useRouter();
  const { user, authenticated, loading: authLoading, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [atividadeTotais, setAtividadeTotais] = useState<AtividadeTotais>({ pendentes: 0, concluidas: 0, atrasadas: 0, proxima_semana: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
  }, [authLoading, authenticated, router]);

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user, isAdmin]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const fetches: Promise<Response>[] = [
        fetch('/api/comercial/oportunidades?limit=10000'),
        fetch('/api/comercial/atividades?limit=100'),
        fetch('/api/comercial/vendedores?ativo=true'),
      ];

      const responses = await Promise.all(fetches.map(f => f.catch(() => null)));

      if (responses[0]?.ok) {
        const d = await responses[0].json();
        setOportunidades(d.data || []);
      }
      if (responses[1]?.ok) {
        const d = await responses[1].json();
        setAtividades(d.data || []);
        if (d.totais) {
          setAtividadeTotais({
            pendentes: toNum(d.totais.pendentes),
            concluidas: toNum(d.totais.concluidas),
            atrasadas: toNum(d.totais.atrasadas),
            proxima_semana: toNum(d.totais.proxima_semana),
          });
        }
      }
      if (responses[2]?.ok) {
        const d = await responses[2].json();
        setVendedores(d.data || []);
      }
    } catch (err) {
      console.error('Erro dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== COMPUTED ====================

  const kpis = useMemo(() => {
    const ativas = oportunidades.filter(o => o.status === 'ABERTA');
    const fechadas = oportunidades.filter(o => o.estagio === 'FECHADA');
    const perdidas = oportunidades.filter(o => o.estagio === 'PERDIDA');
    const valorPipeline = ativas.reduce((s, o) => s + toNum(o.valor_estimado), 0);
    const valorFechado = fechadas.reduce((s, o) => s + toNum(o.valor_estimado), 0);
    const taxaConversao = oportunidades.length > 0 ? (fechadas.length / oportunidades.length) * 100 : 0;
    const ticketMedio = fechadas.length > 0 ? valorFechado / fechadas.length : 0;

    // Mes atual - usar created_at como proxy para data de fechamento
    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const fechadasMes = fechadas.filter(o => new Date(o.created_at) >= inicioMes);
    const valorMes = fechadasMes.reduce((s, o) => s + toNum(o.valor_estimado), 0);

    return {
      totalOps: oportunidades.length,
      ativas: ativas.length,
      valorPipeline,
      fechadas: fechadas.length,
      valorFechado,
      perdidas: perdidas.length,
      taxaConversao,
      ticketMedio,
      fechadasMes: fechadasMes.length,
      valorMes,
      atrasadas: atividadeTotais.atrasadas,
    };
  }, [oportunidades, atividadeTotais]);

  const pipelineData = useMemo(() => {
    const estagios: Record<string, { qtd: number; valor: number }> = {};
    oportunidades.forEach(o => {
      const est = normalizeEstagio(o.estagio);
      if (!estagios[est]) estagios[est] = { qtd: 0, valor: 0 };
      estagios[est].qtd++;
      estagios[est].valor += toNum(o.valor_estimado);
    });
    const maxValor = Math.max(...Object.values(estagios).map(e => e.valor), 1);
    const order = ['EM_ANALISE', 'EM_NEGOCIACAO', 'POS_NEGOCIACAO', 'FECHADA', 'PERDIDA', 'TESTE', 'SUSPENSO', 'SUBSTITUIDO'];
    return order
      .filter(k => estagios[k])
      .map(k => ({
        key: k,
        label: ESTAGIO_CONFIG[k]?.label || k,
        corHex: ESTAGIO_CONFIG[k]?.corHex || '#6b7280',
        qtd: estagios[k].qtd,
        valor: estagios[k].valor,
        pct: (estagios[k].valor / maxValor) * 100,
      }));
  }, [oportunidades]);

  const produtoData = useMemo(() => {
    const prods: Record<string, { qtd: number; valor: number; fechadas: number; valorFechado: number }> = {};
    oportunidades.forEach(o => {
      const p = o.produto || 'OUTROS';
      if (!prods[p]) prods[p] = { qtd: 0, valor: 0, fechadas: 0, valorFechado: 0 };
      prods[p].qtd++;
      prods[p].valor += toNum(o.valor_estimado);
      if (o.estagio === 'FECHADA') {
        prods[p].fechadas++;
        prods[p].valorFechado += toNum(o.valor_estimado);
      }
    });
    return Object.entries(prods)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.valor - a.valor);
  }, [oportunidades]);

  const vendedorRanking = useMemo(() => {
    if (!isAdmin || vendedores.length === 0) return [];
    return vendedores
      .map(v => {
        const ops = oportunidades.filter(o => o.vendedor_nome === v.nome);
        const ativas = ops.filter(o => o.status === 'ABERTA');
        const fechadas = ops.filter(o => o.estagio === 'FECHADA');
        return {
          ...v,
          opsAtivas: ativas.length,
          valorAtivo: ativas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
          fechadas: fechadas.length,
          valorFechado: fechadas.reduce((s, o) => s + toNum(o.valor_estimado), 0),
        };
      })
      .sort((a, b) => b.valorAtivo - a.valorAtivo);
  }, [vendedores, oportunidades, isAdmin]);

  const oportunidadesRecentes = useMemo(() => {
    return [...oportunidades]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }, [oportunidades]);

  const proximasAtividades = useMemo(() => {
    return atividades
      .filter(a => !a.concluida)
      .sort((a, b) => new Date(a.data_agendada || '9999').getTime() - new Date(b.data_agendada || '9999').getTime())
      .slice(0, 6);
  }, [atividades]);

  // ==================== RENDER ====================

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const maxVendedorValor = Math.max(...vendedorRanking.map(v => v.valorAtivo), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/comercial" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition" title="Voltar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Dashboard Comercial</h1>
            </div>
            <div className="flex items-center gap-1">
              {[
                { href: '/comercial', label: 'Pipeline' },
                { href: '/comercial/pipeline', label: 'Kanban' },
                { href: '/comercial/clientes', label: 'Clientes' },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  className="hidden sm:inline-block px-2 py-1 text-xs sm:text-sm text-gray-500 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                  {link.label}
                </Link>
              ))}
              <button onClick={() => fetchAll()}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-gray-50 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-2 sm:p-4 lg:p-6 max-w-[1400px] mx-auto space-y-4">
        {/* ALERTA ATIVIDADES ATRASADAS */}
        {kpis.atrasadas > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 text-red-800 text-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">{kpis.atrasadas} atividade(s) atrasada(s)!</span>
            <Link href="/comercial/atividades" className="ml-auto text-red-600 hover:text-red-800 font-medium text-xs">Ver &rarr;</Link>
          </div>
        )}

        {/* ROW 1: KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <KpiCard label="Pipeline" value={fmtShort(kpis.valorPipeline)} sub={`${kpis.ativas} ativas`} color="text-red-600" bg="bg-red-50" />
          <KpiCard label="Fechado" value={fmtShort(kpis.valorFechado)} sub={`${kpis.fechadas} ops`} color="text-green-600" bg="bg-green-50" />
          <KpiCard label="Este Mês" value={fmtShort(kpis.valorMes)} sub={`${kpis.fechadasMes} fechadas`} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard label="Conversão" value={`${kpis.taxaConversao.toFixed(1)}%`} sub={`${kpis.fechadas}/${kpis.totalOps}`} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard label="Ticket Médio" value={fmtShort(kpis.ticketMedio)} sub="fechadas" color="text-purple-600" bg="bg-purple-50" />
          <KpiCard label="Total" value={String(kpis.totalOps)} sub={`${kpis.perdidas} perdidas`} color="text-gray-700" bg="bg-gray-100" />
        </div>

        {/* ROW 2: PIPELINE CHART + PRODUCT SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Pipeline horizontal bars */}
          <div className="lg:col-span-2 bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-sm">Pipeline por Estágio</h2>
              <Link href="/comercial/pipeline" className="text-xs text-red-600 hover:text-red-700">Kanban &rarr;</Link>
            </div>
            <div className="space-y-2">
              {pipelineData.map(e => (
                <div key={e.key} className="flex items-center gap-2">
                  <div className="w-24 sm:w-28 text-xs text-gray-600 truncate text-right">{e.label}</div>
                  <div className="flex-1 h-7 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(e.pct, 2)}%`, background: e.corHex }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold" style={{ color: e.pct > 30 ? '#fff' : '#374151' }}>
                      {e.qtd} &bull; {fmtShort(e.valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product split */}
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-bold text-gray-900 text-sm mb-3">Por Produto</h2>
            {produtoData.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {produtoData.map(p => {
                  const totalValor = produtoData.reduce((s, x) => s + x.valor, 0) || 1;
                  const pct = (p.valor / totalValor) * 100;
                  return (
                    <div key={p.nome}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-800">{p.nome}</span>
                        <span className="text-gray-500">{p.qtd} ops &bull; {fmtShort(p.valor)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>{p.fechadas} fechadas ({fmtShort(p.valorFechado)})</span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ROW 3: VENDEDOR RANKING (admin) + ATIVIDADES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Vendedor Ranking (admin) ou Oportunidades Recentes (vendedor) */}
          {isAdmin && vendedorRanking.length > 0 ? (
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900 text-sm">Ranking Vendedores</h2>
                <Link href="/comercial/vendedores" className="text-xs text-red-600 hover:text-red-700">Ver todos &rarr;</Link>
              </div>
              <div className="space-y-2">
                {vendedorRanking.map((v, i) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'
                    }`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-800 truncate">{v.nome}</span>
                        <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">{v.opsAtivas} ativas &bull; {v.fechadas} fechadas</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-red-500 to-orange-500"
                          style={{ width: `${(v.valorAtivo / maxVendedorValor) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                        <span>Pipeline: {fmtShort(v.valorAtivo)}</span>
                        <span>Fechado: {fmtShort(v.valorFechado)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-bold text-gray-900 text-sm mb-3">Oportunidades Recentes</h2>
              <div className="space-y-1.5">
                {oportunidadesRecentes.map(op => {
                  const cfg = ESTAGIO_CONFIG[op.estagio];
                  return (
                    <div key={op.id}
                      onClick={() => router.push('/comercial')}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{op.cliente_nome}</div>
                        <div className="text-[10px] text-gray-400">{op.produto || '-'}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-gray-800">{fmtShort(toNum(op.valor_estimado))}</span>
                        {cfg && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white" style={{ background: cfg.corHex }}>
                            {cfg.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Atividades */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-sm">Atividades</h2>
              <Link href="/comercial/atividades" className="text-xs text-red-600 hover:text-red-700">Ver todas &rarr;</Link>
            </div>

            {/* Mini KPIs */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <MiniKpi label="Pendentes" value={atividadeTotais.pendentes} color="text-gray-700" />
              <MiniKpi label="Atrasadas" value={atividadeTotais.atrasadas} color="text-red-600" />
              <MiniKpi label="Próx. sem." value={atividadeTotais.proxima_semana} color="text-orange-600" />
              <MiniKpi label="Concluídas" value={atividadeTotais.concluidas} color="text-green-600" />
            </div>

            {/* Lista */}
            <div className="space-y-1.5">
              {proximasAtividades.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">Nenhuma atividade pendente</p>
              ) : (
                proximasAtividades.map(a => {
                  const isAtrasada = a.data_agendada && new Date(a.data_agendada) < new Date();
                  return (
                    <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg ${isAtrasada ? 'bg-red-50' : 'hover:bg-gray-50'} transition`}>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{a.titulo}</div>
                        <div className="text-[10px] text-gray-400 truncate">{a.cliente_nome || a.oportunidade_titulo || '-'}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          a.tipo === 'LIGACAO' ? 'bg-blue-100 text-blue-700' :
                          a.tipo === 'EMAIL' ? 'bg-purple-100 text-purple-700' :
                          a.tipo === 'REUNIAO' ? 'bg-green-100 text-green-700' :
                          a.tipo === 'VISITA' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {a.tipo}
                        </span>
                        {a.data_agendada && (
                          <span className={`text-[10px] ${isAtrasada ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                            {new Date(a.data_agendada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: DISTRIBUIÇÃO POR ESTÁGIO - barras verticais */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Distribuição por Estágio</h2>
          <StageBarChart data={pipelineData} />
        </div>

        {/* ROW 5: Últimas oportunidades - mini table */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-sm">Últimas Oportunidades</h2>
            <Link href="/comercial" className="text-xs text-red-600 hover:text-red-700">Ver pipeline &rarr;</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-xs">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase border-b">
                  <th className="text-left py-1.5 px-2 w-[35%]">Cliente</th>
                  <th className="text-left py-1.5 px-2 w-[12%] hidden sm:table-cell">Produto</th>
                  <th className="text-right py-1.5 px-2 w-[15%]">Valor</th>
                  <th className="text-center py-1.5 px-2 w-[12%]">Etapa</th>
                  <th className="text-center py-1.5 px-2 w-[8%] hidden sm:table-cell">Prob</th>
                  {isAdmin && <th className="text-left py-1.5 px-2 w-[18%] hidden lg:table-cell">Vendedor</th>}
                </tr>
              </thead>
              <tbody>
                {oportunidadesRecentes.map((op, idx) => {
                  const cfg = ESTAGIO_CONFIG[op.estagio];
                  return (
                    <tr key={op.id}
                      onClick={() => router.push('/comercial')}
                      className={`border-b last:border-b-0 hover:bg-blue-50/50 cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="py-1.5 px-2">
                        <span className="block truncate font-medium text-gray-900">{op.cliente_nome}</span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-500 hidden sm:table-cell">{op.produto || '-'}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-800 tabular-nums">{fmtShort(toNum(op.valor_estimado))}</td>
                      <td className="py-1.5 px-2 text-center">
                        {cfg && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold text-white" style={{ background: cfg.corHex }}>
                            {cfg.label}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center text-gray-500 hidden sm:table-cell">{toNum(op.probabilidade)}%</td>
                      {isAdmin && <td className="py-1.5 px-2 text-gray-500 hidden lg:table-cell"><span className="block truncate">{op.vendedor_nome || '-'}</span></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function KpiCard({ label, value, sub, color, bg }: { label: string; value: string; sub: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-lg p-3 sm:p-4`}>
      <div className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-lg sm:text-xl font-bold ${color} mt-0.5 tabular-nums`}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function MiniKpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  );
}

function StageBarChart({ data }: { data: Array<{ key: string; label: string; corHex: string; qtd: number; valor: number }> }) {
  if (data.length === 0) return <p className="text-gray-400 text-xs text-center py-4">Sem dados</p>;
  const maxQtd = Math.max(...data.map(d => d.qtd), 1);
  const barMaxH = 120;

  return (
    <div className="flex items-end justify-around gap-2 sm:gap-4" style={{ minHeight: barMaxH + 60 }}>
      {data.map(stage => {
        const h = Math.max((stage.qtd / maxQtd) * barMaxH, 4);
        return (
          <div key={stage.key} className="flex flex-col items-center flex-1 min-w-0">
            <span className="text-xs font-bold text-gray-800 mb-1">{stage.qtd}</span>
            <div
              className="w-full max-w-[48px] rounded-t-md transition-all duration-500"
              style={{ height: h, background: stage.corHex }}
            />
            <div className="text-[9px] sm:text-[10px] text-gray-500 mt-1 text-center leading-tight truncate w-full">{stage.label}</div>
            <div className="text-[9px] text-gray-400 text-center">{fmtShort(stage.valor)}</div>
          </div>
        );
      })}
    </div>
  );
}
