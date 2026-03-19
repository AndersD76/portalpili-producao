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

interface SinprodData {
  stats: {
    total: number;
    em_producao: number;
    paralisadas: number;
    concluidas: number;
    faturadas: number;
    entregues: number;
    canceladas: number;
    apontamentos_abertos: number;
    recursos: number;
  };
  chart_data: Array<{ status: string; total: number }>;
  opds_em_producao: Array<{
    CODIGO: string;
    NUMOPD: string;
    COD_CLIENTE: string;
    STATUS: string;
    DATA_PEDIDO: string;
    DATA_FINAL_PREV: string;
    DATA_INICIO: string;
    PRIORIDADE: number;
    CLIENTE_NOME: string;
  }>;
  apontamentos_abertos: Array<{
    DATA_HORA_INICIO: string;
    ORDEM_FABRICACAO: string | null;
    RECURSO: string | null;
    ESTAGIO_INICIO: string;
    FUNCIONARIO_INICIO: string;
    NOME_FUNCIONARIO: string | null;
  }>;
  recursos: Array<{
    CODIGO: string;
    DESCRICAO: string;
    TIPO: string;
    CENTRO: string;
  }>;
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
              {sinprodData ? `${sinprodData.stats.em_producao} em produção · ${sinprodData.stats.apontamentos_abertos} apontamentos abertos` : sinprodError || 'Carregando...'}
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
                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                  {[
                    { value: sinprodData.stats.em_producao, label: 'Em Produção', color: 'text-blue-600' },
                    { value: sinprodData.stats.paralisadas, label: 'Paralisadas', color: 'text-amber-600' },
                    { value: sinprodData.stats.concluidas, label: 'Concluídas', color: 'text-green-600' },
                    { value: sinprodData.stats.faturadas + sinprodData.stats.entregues, label: 'Faturadas/Entregues', color: 'text-gray-600' },
                    { value: sinprodData.stats.apontamentos_abertos, label: 'Apontamentos Abertos', color: 'text-red-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart: OPDs por status */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">OPDs por Status</h3>
                  <div className="space-y-2">
                    {sinprodData.chart_data.map((item) => {
                      const maxVal = Math.max(...sinprodData.chart_data.map(d => d.total));
                      const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                      const colorMap: Record<string, string> = {
                        'Em Produção': 'bg-blue-500',
                        'Paralisada': 'bg-amber-500',
                        'Concluída': 'bg-green-500',
                        'Faturada': 'bg-purple-500',
                        'Entregue': 'bg-gray-500',
                        'Cancelada': 'bg-red-400',
                      };
                      return (
                        <div key={item.status} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-28 text-right shrink-0">{item.status}</span>
                          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${colorMap[item.status] || 'bg-gray-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-900 w-10">{item.total}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-right">
                    <span className="text-xs text-gray-500">Total: </span>
                    <span className="text-sm font-bold text-gray-900">{sinprodData.stats.total} OPDs</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* OPDs em produção */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">OPDs em Produção ({sinprodData.opds_em_producao.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                      {sinprodData.opds_em_producao.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Nenhuma OPD em produção</div>
                      ) : (
                        sinprodData.opds_em_producao.map((opd) => (
                          <div key={opd.CODIGO} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{opd.NUMOPD}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  opd.STATUS === 'Em Produção' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                }`}>{opd.STATUS}</span>
                                {opd.PRIORIDADE > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">P{opd.PRIORIDADE}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {opd.DATA_FINAL_PREV ? new Date(opd.DATA_FINAL_PREV).toLocaleDateString('pt-BR') : ''}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">{opd.CLIENTE_NOME || opd.COD_CLIENTE}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Apontamentos abertos */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Apontamentos em Aberto ({sinprodData.apontamentos_abertos.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                      {sinprodData.apontamentos_abertos.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Nenhum apontamento aberto</div>
                      ) : (
                        sinprodData.apontamentos_abertos.map((apt, i) => (
                          <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-sm font-medium text-gray-900">
                                  {apt.NOME_FUNCIONARIO || `Func. ${apt.FUNCIONARIO_INICIO}`}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {apt.DATA_HORA_INICIO ? new Date(apt.DATA_HORA_INICIO).toLocaleDateString('pt-BR') : ''}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 ml-4">
                              {apt.ORDEM_FABRICACAO && <span>OF: {apt.ORDEM_FABRICACAO}</span>}
                              {apt.RECURSO && <span>Recurso: {apt.RECURSO}</span>}
                              <span>Estágio: {apt.ESTAGIO_INICIO}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Recursos */}
                {sinprodData.recursos.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Recursos / Máquinas ({sinprodData.recursos.length})</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {sinprodData.recursos.map((rec) => (
                        <div key={rec.CODIGO} className="px-4 py-3 border-b md:border-r border-gray-100">
                          <div className="text-sm font-medium text-gray-900">{rec.DESCRICAO}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{rec.CENTRO || rec.TIPO || rec.CODIGO}</div>
                        </div>
                      ))}
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
