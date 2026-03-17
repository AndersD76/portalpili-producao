'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import MachineCard from '@/components/machines/MachineCard';
import OpdProcessFlow from '@/components/machines/OpdProcessFlow';
import { useMachineWebSocket } from '@/hooks/useMachineWebSocket';
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
  product_type: string;
  operator_name: string;
  operator_shift: string;
}

type ViewMode = 'panorama' | 'cameras';

export default function MaquinasDashboard() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('panorama');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [expandedOpds, setExpandedOpds] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState<PanoramaStats | null>(null);
  const [opds, setOpds] = useState<OpdData[]>([]);
  const [machinesByStage, setMachinesByStage] = useState<Record<string, MachineInfo>>({});
  const [loading, setLoading] = useState(true);

  const [machines, setMachines] = useState<MachineWithKpis[]>([]);
  const [recentMotionIds, setRecentMotionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchPanorama();
    fetchMachines();
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
          </div>

          <div className="w-px h-6 bg-gray-200" />

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

          {viewMode === 'panorama' && opds.length > 0 && (
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
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'panorama' ? (
          <>
            {/* Stats cards */}
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

            {/* OPD Process flows */}
            <div className="space-y-3">
              {opds.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  Nenhuma OPD encontrada
                </div>
              ) : (
                opds.map(opd => (
                  <OpdProcessFlow
                    key={opd.numero}
                    opd={opd}
                    machinesByStage={machinesByStage}
                    expanded={expandedOpds.has(opd.numero)}
                    onToggle={() => toggleOpd(opd.numero)}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          /* Camera view */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {machines.length === 0 ? (
              <div className="col-span-2 text-center py-20 text-gray-400">
                Nenhuma câmera cadastrada
              </div>
            ) : (
              machines
                .filter(m => filterTipo === 'all' || (m as unknown as MachineInfo).product_type === filterTipo)
                .map(machine => (
                  <MachineCard
                    key={machine.id}
                    machine={machine}
                    recentMotion={recentMotionIds.has(machine.id)}
                  />
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
