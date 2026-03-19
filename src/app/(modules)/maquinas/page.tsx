'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import MachineCard from '@/components/machines/MachineCard';
import MachineFormModal from '@/components/machines/MachineFormModal';
import OpdProcessFlow from '@/components/machines/OpdProcessFlow';
import { useMachineWebSocket } from '@/hooks/useMachineWebSocket';
import { toast } from 'sonner';
import type { MachineWithKpis, WSMessage, MachineStatus } from '@/types/machines';

const MAQUINAS_NAV = [
  {
    href: '/producao',
    label: 'Produção',
    icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  },
  {
    href: '/producao/dashboard',
    label: 'Dashboard',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
];

interface PanoramaStats {
  total_opds: number;
  total_atividades: number;
  concluidas: number;
  em_andamento: number;
  avg_progress: number;
  tombadores: number;
  coletores: number;
}

interface OpdData {
  numero: string;
  tipo_produto: string;
  cliente: string | null;
  previsao_termino: string | null;
  progress_pct: number;
  total_atividades: string;
  concluidas: string;
  em_andamento: string;
  a_realizar: string;
  pausadas: string;
  sinprod_status: string | null;
  sinprod_sync: string | null;
  stages: Array<{
    atividade: string;
    status: string;
    responsavel: string | null;
    data_inicio: string | null;
    data_termino: string | null;
    tempo_acumulado_segundos: number | null;
    tem_nao_conformidade: boolean;
  }>;
}

interface MachineInfo {
  id: string;
  name: string;
  machine_code: string;
  status: string;
  cam_ip: string | null;
  linked_stages: string[];
  operator_name: string;
  operator_shift: string;
}

interface ChartItem { label: string; value: number }

interface SinprodData {
  stats: {
    total_opds: number;
    em_producao: number;
    paralisadas: number;
    concluidas: number;
    faturadas: number;
    trabalhando_agora: number;
    total_operadores_30d: number;
  };
  charts: {
    opds_por_status: ChartItem[];
    operadores_30d: Array<{ OPERADOR: string; TOTAL: number; ABERTOS: number; FECHADOS: number; PECAS: number; REFUGO: number }>;
    recursos_30d: Array<{ CD_RECURSO: string; TOTAL: number; ATIVOS: number }>;
    processos_30d: Array<{ PROCESSO: string; TOTAL: number; ABERTOS: number; FECHADOS: number }>;
  };
  trabalhando_agora: Array<{ nome: string; recurso: string | null; of: string | null; estagio: string; inicio: string }>;
  opds_em_producao: Array<{ NUMOPD: string; STATUS: string; COD_CLIENTE: string; DATA_FINAL_PREV: string; DATA_INICIO: string; PRIORIDADE: number; CLIENTE_NOME: string }>;
  tempo_recente: Array<{ DT_LEITURA_INI: string; DT_LEITURA_FIM: string | null; NOME_ABRIU: string; NOME_FECHOU: string | null; CD_RECURSO: string; ORDEM_FABRICACAO: string; CD_PROCESSO: string; HORAS_COMPUTADAS: string; QTDE_PRODUZIDA: number; QTDE_REFUGADA: number }>;
}

type ViewMode = 'panorama' | 'cameras' | 'sinprod';

export default function MaquinasDashboard() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('panorama');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterCamStatus, setFilterCamStatus] = useState<string>('all');
  const [expandedOpds, setExpandedOpds] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState<PanoramaStats | null>(null);
  const [opds, setOpds] = useState<OpdData[]>([]);
  const [machinesByStage, setMachinesByStage] = useState<Record<string, MachineInfo>>({});
  const [loading, setLoading] = useState(true);

  const [machines, setMachines] = useState<MachineWithKpis[]>([]);
  const [recentMotionIds, setRecentMotionIds] = useState<Set<string>>(new Set());

  // SINPROD state
  const [sinprodData, setSinprodData] = useState<SinprodData | null>(null);
  const [sinprodLoading, setSinprodLoading] = useState(false);
  const [sinprodError, setSinprodError] = useState<string | null>(null);

  // CRUD state
  const [formOpen, setFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineWithKpis | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchPanorama();
    fetchMachines();
    fetchSinprod();
  }, [authLoading, authenticated, router]);

  const fetchPanorama = async () => {
    try {
      const url = filterTipo !== 'all' ? `/api/machines/panorama?tipo=${filterTipo}` : '/api/machines/panorama';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStats(json.data.stats);
        setOpds(json.data.opds);
        setMachinesByStage(json.data.machines_by_stage || {});
      }
    } catch (err) {
      console.error('Erro ao carregar panorama:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSinprod = async () => {
    setSinprodLoading(true);
    setSinprodError(null);
    try {
      const res = await fetch('/api/sinprod/producao?view=dashboard');
      const json = await res.json();
      if (json.success) {
        setSinprodData(json.data);
      } else {
        setSinprodError(json.error || 'Erro ao carregar dados SINPROD');
      }
    } catch (err) {
      setSinprodError('SINPROD indisponível');
      console.error('Erro SINPROD:', err);
    } finally {
      setSinprodLoading(false);
    }
  };

  const fetchMachines = async () => {
    try {
      const res = await fetch('/api/machines');
      const json = await res.json();
      if (json.success) setMachines(json.data);
    } catch (err) {
      console.error('Erro ao carregar máquinas:', err);
    }
  };

  useEffect(() => {
    if (authenticated) fetchPanorama();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTipo]);

  const handleMotionEvent = useCallback((msg: WSMessage) => {
    setRecentMotionIds(prev => new Set(prev).add(msg.machine_id));
    setTimeout(() => {
      setRecentMotionIds(prev => { const n = new Set(prev); n.delete(msg.machine_id); return n; });
    }, 30000);
    setMachines(prev => prev.map(m => m.id !== msg.machine_id ? m : {
      ...m, status: 'online' as MachineStatus, last_seen: msg.timestamp,
      kpis: (msg.data.kpis as MachineWithKpis['kpis']) || m.kpis,
    }));
  }, []);

  const handleProductionUpdate = useCallback((msg: WSMessage) => {
    setMachines(prev => prev.map(m => m.id !== msg.machine_id ? m : {
      ...m, kpis: (msg.data.kpis as MachineWithKpis['kpis']) || m.kpis,
    }));
  }, []);

  const handleMachineStatus = useCallback((msg: WSMessage) => {
    setMachines(prev => prev.map(m => m.id !== msg.machine_id ? m : {
      ...m, status: (msg.data.status as MachineStatus) || m.status, last_seen: msg.timestamp,
    }));
  }, []);

  const { connectionState } = useMachineWebSocket({
    machineId: 'dashboard',
    onMotionEvent: handleMotionEvent,
    onProductionUpdate: handleProductionUpdate,
    onMachineStatus: handleMachineStatus,
  });

  const toggleOpd = (numero: string) => {
    setExpandedOpds(prev => {
      const n = new Set(prev);
      if (n.has(numero)) n.delete(numero); else n.add(numero);
      return n;
    });
  };

  const handleEditMachine = (machine: MachineWithKpis) => {
    setEditingMachine(machine);
    setFormOpen(true);
  };

  const handleNewMachine = () => {
    setEditingMachine(null);
    setFormOpen(true);
  };

  const handleDeleteMachine = async (machine: MachineWithKpis) => {
    if (!confirm(`Tem certeza que deseja excluir "${machine.name}" (${machine.machine_code})?\n\nTodos os eventos e registros de produção serão apagados.`)) return;

    try {
      const res = await fetch(`/api/machines/${machine.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success(`Máquina "${machine.name}" excluída`);
        fetchMachines();
      } else {
        toast.error(json.error || 'Erro ao excluir');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const handleMachineSaved = () => {
    toast.success(editingMachine ? 'Máquina atualizada' : 'Máquina criada');
    fetchMachines();
  };

  const online = machines.filter(m => m.status === 'online').length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Chão de Fábrica"
        backHref="/"
        navLinks={MAQUINAS_NAV}
        rightExtra={
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
            connectionState === 'connected'
              ? 'text-green-700 bg-green-50'
              : 'text-gray-500 bg-gray-100'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionState === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            {connectionState === 'connected' ? 'Tempo real' : 'Offline'}
          </span>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* View toggle + filters */}
        <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-1">
          <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('panorama')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
                viewMode === 'panorama'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Processos
            </button>
            <button
              onClick={() => setViewMode('cameras')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
                viewMode === 'cameras'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Câmeras
            </button>
            <button
              onClick={() => setViewMode('sinprod')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors font-medium ${
                viewMode === 'sinprod'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              SINPROD
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {viewMode === 'sinprod' ? (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {sinprodData ? `${sinprodData.stats.em_producao} em produção · ${sinprodData.stats.trabalhando_agora} trabalhando agora · ${sinprodData.stats.total_operadores_30d} operadores (30d)` : sinprodError || 'Carregando...'}
            </span>
          ) : viewMode === 'panorama' ? (
            <>
              {(['all', 'TOMBADOR', 'COLETOR'] as const).map(tipo => (
                <button
                  key={tipo}
                  onClick={() => setFilterTipo(tipo)}
                  className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors font-medium ${
                    filterTipo === tipo
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {tipo === 'all' ? 'Todos'
                    : tipo === 'TOMBADOR' ? `Tombadores (${stats?.tombadores || 0})`
                    : `Coletores (${stats?.coletores || 0})`}
                </button>
              ))}

              {opds.length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    onClick={() => {
                      if (expandedOpds.size === opds.length) {
                        setExpandedOpds(new Set());
                      } else {
                        setExpandedOpds(new Set(opds.map(o => o.numero)));
                      }
                    }}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    {expandedOpds.size === opds.length ? 'Recolher tudo' : 'Expandir tudo'}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {(['all', 'online', 'idle', 'offline'] as const).map(st => {
                const countMap: Record<string, number> = {
                  all: machines.length,
                  online: machines.filter(m => m.status === 'online').length,
                  idle: machines.filter(m => m.status === 'idle').length,
                  offline: machines.filter(m => m.status === 'offline').length,
                };
                const labelMap: Record<string, string> = {
                  all: `Todas (${countMap.all})`,
                  online: `Operando (${countMap.online})`,
                  idle: `Paradas (${countMap.idle})`,
                  offline: `Offline (${countMap.offline})`,
                };
                return (
                  <button
                    key={st}
                    onClick={() => setFilterCamStatus(st)}
                    className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors font-medium ${
                      filterCamStatus === st
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    {labelMap[st]}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && viewMode === 'panorama' && (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                {[
                  { value: stats.total_opds, label: 'OPDs', color: 'text-gray-900' },
                  { value: stats.concluidas, label: 'Etapas Concluídas', color: 'text-green-600' },
                  { value: stats.em_andamento, label: 'Em Andamento', color: 'text-blue-600' },
                  { value: `${stats.avg_progress}%`, label: 'Progresso Geral', color: stats.avg_progress >= 70 ? 'text-green-600' : stats.avg_progress >= 40 ? 'text-amber-600' : 'text-red-600' },
                  { value: `${online}/${machines.length}`, label: 'Câmeras Online', color: 'text-gray-900' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {opds.length === 0 ? (
                <div className="text-center py-20 text-gray-400">Nenhuma OPD encontrada</div>
              ) : (
                opds.map(opd => (
                  <OpdProcessFlow key={opd.numero} opd={opd} machinesByStage={machinesByStage} expanded={expandedOpds.has(opd.numero)} onToggle={() => toggleOpd(opd.numero)} />
                ))
              )}
            </div>
          </>
        )}

        {!loading && viewMode === 'cameras' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleNewMachine} className="flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-red-400 hover:bg-red-50/50 transition-all min-h-[260px] group">
              <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-red-100 flex items-center justify-center mb-3 transition-colors">
                <svg className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-500 group-hover:text-red-600 transition-colors">Nova Máquina</span>
              <span className="text-xs text-gray-400 mt-1">Cadastrar equipamento + câmera</span>
            </button>
            {machines.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-gray-400">Nenhuma máquina cadastrada</div>
            ) : (
              machines.filter(m => filterCamStatus === 'all' || m.status === filterCamStatus).map(machine => (
                <MachineCard key={machine.id} machine={machine} recentMotion={recentMotionIds.has(machine.id)} onEdit={handleEditMachine} onDelete={handleDeleteMachine} />
              ))
            )}
          </div>
        )}

        {!loading && viewMode === 'sinprod' && (
          <>
            {sinprodLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />
                ))}
              </div>
            )}
            {!sinprodLoading && sinprodError && (
              <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
                <p className="text-red-600 font-medium">{sinprodError}</p>
                <p className="text-sm text-gray-500 mt-2">Verifique se o sinprod-api está rodando e o tunnel está ativo</p>
                <button onClick={fetchSinprod} className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Tentar novamente</button>
              </div>
            )}
            {!sinprodLoading && !sinprodError && sinprodData && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { value: sinprodData.stats.trabalhando_agora, label: 'Trabalhando Agora', color: 'text-green-600' },
                    { value: sinprodData.stats.em_producao, label: 'OPDs em Produção', color: 'text-blue-600' },
                    { value: sinprodData.stats.paralisadas, label: 'Paralisadas', color: 'text-amber-600' },
                    { value: sinprodData.stats.total_operadores_30d, label: 'Operadores (30d)', color: 'text-gray-900' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Quem está trabalhando agora */}
                {sinprodData.trabalhando_agora.length > 0 && (
                  <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4 mb-4">
                    <h3 className="text-sm font-semibold text-green-700 mb-3">Trabalhando Agora ({sinprodData.trabalhando_agora.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sinprodData.trabalhando_agora.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{t.nome}</div>
                            <div className="text-[10px] text-gray-500 truncate">
                              {t.of && `OF ${t.of}`} {t.recurso && `· Rec ${t.recurso}`} · Est {t.estagio}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Charts 2x2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* OPDs por status */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">OPDs por Status</h3>
                    <div className="space-y-2">
                      {sinprodData.charts.opds_por_status.map((item) => {
                        const maxVal = Math.max(...sinprodData.charts.opds_por_status.map(d => d.value));
                        const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                        const colors: Record<string, string> = { 'Em Produção': 'bg-blue-500', 'Paralisada': 'bg-amber-500', 'Concluída': 'bg-green-500', 'Faturada': 'bg-purple-500', 'Entregue': 'bg-gray-500', 'Cancelada': 'bg-red-400' };
                        return (
                          <div key={item.label} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-24 text-right shrink-0">{item.label}</span>
                            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                              <div className={`h-full rounded ${colors[item.label] || 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-900 w-8 text-right">{item.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Processos */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Apontamentos por Processo (30d)</h3>
                    <div className="space-y-2">
                      {sinprodData.charts.processos_30d.map((p) => {
                        const maxVal = Math.max(...sinprodData.charts.processos_30d.map(d => d.TOTAL));
                        const pct = maxVal > 0 ? (p.TOTAL / maxVal) * 100 : 0;
                        return (
                          <div key={p.PROCESSO} className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-600 w-16 text-right shrink-0">Proc {p.PROCESSO}</span>
                            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${maxVal > 0 ? (p.FECHADOS / maxVal) * 100 : 0}%` }} />
                              <div className="h-full bg-red-400" style={{ width: `${maxVal > 0 ? (p.ABERTOS / maxVal) * 100 : 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-900 w-16 text-right">{p.FECHADOS}F/{p.ABERTOS}A</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recursos */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Recursos Utilizados (30d)</h3>
                    {sinprodData.charts.recursos_30d.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
                    ) : (
                      <div className="space-y-2">
                        {sinprodData.charts.recursos_30d.map((r) => {
                          const maxVal = Math.max(...sinprodData.charts.recursos_30d.map(d => d.TOTAL));
                          const pct = maxVal > 0 ? (r.TOTAL / maxVal) * 100 : 0;
                          return (
                            <div key={r.CD_RECURSO} className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-600 w-32 text-right shrink-0 truncate">{r.CD_RECURSO}</span>
                              <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                                <div className="h-full rounded bg-orange-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-900 w-16 text-right">{r.TOTAL} ({r.ATIVOS} ativo)</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* OPDs em produção */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">OPDs em Produção ({sinprodData.opds_em_producao.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                      {sinprodData.opds_em_producao.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Nenhuma OPD em produção</div>
                      ) : (
                        sinprodData.opds_em_producao.map((opd) => (
                          <div key={opd.NUMOPD} className="px-4 py-2.5 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{opd.NUMOPD}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${opd.STATUS === 'Em Produção' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{opd.STATUS}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">{opd.DATA_FINAL_PREV ? new Date(opd.DATA_FINAL_PREV).toLocaleDateString('pt-BR') : ''}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{opd.CLIENTE_NOME || opd.COD_CLIENTE}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Operadores - tabela completa */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Operadores — Últimos 30 dias</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-200">
                          <th className="text-left py-2 pr-4">Operador</th>
                          <th className="text-right py-2 px-2">Total</th>
                          <th className="text-right py-2 px-2">Abertos</th>
                          <th className="text-right py-2 px-2">Fechados</th>
                          <th className="text-right py-2 px-2">Peças</th>
                          <th className="text-right py-2 px-2">Refugo</th>
                          <th className="text-left py-2 pl-3 w-32">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {sinprodData.charts.operadores_30d.map((op, i) => {
                          const maxT = Math.max(...sinprodData.charts.operadores_30d.map(o => o.TOTAL));
                          const pct = maxT > 0 ? (op.TOTAL / maxT) * 100 : 0;
                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-2 pr-4 font-medium text-gray-900">{op.OPERADOR}</td>
                              <td className="py-2 px-2 text-right font-bold">{op.TOTAL}</td>
                              <td className="py-2 px-2 text-right text-red-500">{op.ABERTOS || '-'}</td>
                              <td className="py-2 px-2 text-right text-green-600">{op.FECHADOS}</td>
                              <td className="py-2 px-2 text-right">{op.PECAS || '-'}</td>
                              <td className="py-2 px-2 text-right text-red-400">{op.REFUGO || '-'}</td>
                              <td className="py-2 pl-3">
                                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tempo recente - últimos apontamentos */}
                {sinprodData.tempo_recente.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Últimos Apontamentos (7 dias)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] text-gray-500 uppercase border-b border-gray-200">
                            <th className="text-left py-2">Início</th>
                            <th className="text-left py-2">Fim</th>
                            <th className="text-left py-2">Abriu</th>
                            <th className="text-left py-2">Fechou</th>
                            <th className="text-left py-2">OF</th>
                            <th className="text-left py-2">Recurso</th>
                            <th className="text-left py-2">Proc</th>
                            <th className="text-right py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sinprodData.tempo_recente.map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-1.5 text-gray-700">{t.DT_LEITURA_INI ? new Date(t.DT_LEITURA_INI).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="py-1.5 text-gray-700">{t.DT_LEITURA_FIM ? new Date(t.DT_LEITURA_FIM).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="py-1.5 font-medium text-gray-900">{t.NOME_ABRIU || '-'}</td>
                              <td className="py-1.5 text-gray-700">{t.NOME_FECHOU || '-'}</td>
                              <td className="py-1.5 text-gray-600">{t.ORDEM_FABRICACAO || '-'}</td>
                              <td className="py-1.5 text-gray-600">{t.CD_RECURSO || '-'}</td>
                              <td className="py-1.5 text-gray-600">{t.CD_PROCESSO || '-'}</td>
                              <td className="py-1.5 text-right">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.DT_LEITURA_FIM ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  {t.DT_LEITURA_FIM ? 'Fechado' : 'Aberto'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <MachineFormModal
        open={formOpen}
        machine={editingMachine}
        onClose={() => { setFormOpen(false); setEditingMachine(null); }}
        onSaved={handleMachineSaved}
      />
    </div>
  );
}
