'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import MachineCard from '@/components/machines/MachineCard';
import OpdProcessFlow from '@/components/machines/OpdProcessFlow';
import { useMachineWebSocket } from '@/hooks/useMachineWebSocket';
import type { MachineWithKpis, WSMessage, MachineStatus } from '@/types/machines';

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
  const { authenticated } = useAuth();
  const router = useRouter();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('panorama');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [expandedOpds, setExpandedOpds] = useState<Set<string>>(new Set());

  // Panorama data
  const [stats, setStats] = useState<PanoramaStats | null>(null);
  const [opds, setOpds] = useState<OpdData[]>([]);
  const [machinesByStage, setMachinesByStage] = useState<Record<string, MachineInfo>>({});
  const [loading, setLoading] = useState(true);

  // Cameras data
  const [machines, setMachines] = useState<MachineWithKpis[]>([]);
  const [recentMotionIds, setRecentMotionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchPanorama();
    fetchMachines();
  }, [authenticated, router]);

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

  // Refetch when filter changes
  useEffect(() => {
    if (authenticated) fetchPanorama();
  }, [filterTipo]);

  // Real-time events
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">PILI_MAQ — Panorama de Produção</h1>
              <p className="text-xs text-gray-500">
                {stats ? `${stats.total_opds} OPDs · ${stats.concluidas}/${stats.total_atividades} etapas concluídas · ${stats.avg_progress}% geral` : 'Carregando...'}
                {machines.length > 0 && ` · ${machines.length} câmeras (${online} online)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 text-xs ${
                connectionState === 'connected' ? 'text-green-400' : 'text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`} />
                {connectionState === 'connected' ? 'Tempo real' : 'Offline'}
              </span>
              <Link href="/producao" className="text-xs text-gray-400 hover:text-white transition-colors">
                ← Produção
              </Link>
            </div>
          </div>

          {/* View tabs + Filters */}
          <div className="flex items-center gap-3 mt-3 overflow-x-auto pb-1">
            {/* View mode toggle */}
            <div className="flex bg-gray-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('panorama')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === 'panorama' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Processos
              </button>
              <button
                onClick={() => setViewMode('cameras')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  viewMode === 'cameras' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Câmeras
              </button>
            </div>

            <div className="w-px h-5 bg-gray-800" />

            {/* Product type filter */}
            {(['all', 'TOMBADOR', 'COLETOR'] as const).map(tipo => (
              <button
                key={tipo}
                onClick={() => setFilterTipo(tipo)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                  filterTipo === tipo ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {tipo === 'all' ? 'Todos'
                  : tipo === 'TOMBADOR' ? `Tombadores (${stats?.tombadores || 0})`
                  : `Coletores (${stats?.coletores || 0})`}
              </button>
            ))}

            {viewMode === 'panorama' && opds.length > 0 && (
              <>
                <div className="w-px h-5 bg-gray-800" />
                <button
                  onClick={() => {
                    if (expandedOpds.size === opds.length) {
                      setExpandedOpds(new Set());
                    } else {
                      setExpandedOpds(new Set(opds.map(o => o.numero)));
                    }
                  }}
                  className="px-3 py-1 text-xs text-gray-500 hover:text-gray-300 rounded-full hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  {expandedOpds.size === opds.length ? 'Recolher tudo' : 'Expandir tudo'}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-900 rounded-lg border border-gray-800 h-20 animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'panorama' ? (
          <>
            {/* Stats bar */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 text-center">
                  <div className="text-2xl font-bold text-white">{stats.total_opds}</div>
                  <div className="text-[10px] text-gray-500 uppercase">OPDs</div>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.concluidas}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Etapas Concluídas</div>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.em_andamento}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Em Andamento</div>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 text-center">
                  <div className={`text-2xl font-bold ${
                    stats.avg_progress >= 70 ? 'text-green-400' : stats.avg_progress >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>{stats.avg_progress}%</div>
                  <div className="text-[10px] text-gray-500 uppercase">Progresso Geral</div>
                </div>
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 text-center">
                  <div className="text-2xl font-bold text-white">{online}/{machines.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Câmeras Online</div>
                </div>
              </div>
            )}

            {/* OPD Process flows */}
            <div className="space-y-2">
              {opds.length === 0 ? (
                <div className="text-center py-20 text-gray-600">
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
              <div className="col-span-2 text-center py-20 text-gray-600">
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
      </main>
    </div>
  );
}
