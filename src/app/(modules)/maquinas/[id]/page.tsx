'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CameraFeed from '@/components/machines/CameraFeed';
import MotionZones from '@/components/machines/MotionZones';
import KpiCard from '@/components/machines/KpiCard';
import EventFeed from '@/components/machines/EventFeed';
import ProductionChart from '@/components/machines/ProductionChart';
import { useMachineWebSocket } from '@/hooks/useMachineWebSocket';
import type {
  Machine, MachineEvent, ShiftKpis, WSMessage,
  MachineStatus, ZoneIntensities, ProductionDataPoint
} from '@/types/machines';

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authenticated } = useAuth();
  const router = useRouter();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [kpis, setKpis] = useState<ShiftKpis | null>(null);
  const [events, setEvents] = useState<MachineEvent[]>([]);
  const [productionData, setProductionData] = useState<ProductionDataPoint[]>([]);
  const [zones, setZones] = useState<ZoneIntensities>({ Q1: 0, Q2: 0, Q3: 0, Q4: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchMachineData();
    fetchEvents();
    fetchProduction();
  }, [authenticated, router, id]);

  const fetchMachineData = async () => {
    try {
      const res = await fetch(`/api/machines/${id}`);
      const json = await res.json();
      if (json.success) {
        setMachine(json.data);
        setKpis(json.data.kpis);
        if (json.data.kpis?.motion_by_zone) {
          const mz = json.data.kpis.motion_by_zone;
          const total = Math.max(mz.Q1 + mz.Q2 + mz.Q3 + mz.Q4, 1);
          setZones({
            Q1: mz.Q1 / total,
            Q2: mz.Q2 / total,
            Q3: mz.Q3 / total,
            Q4: mz.Q4 / total,
          });
        }
      }
    } catch (err) {
      console.error('Erro ao carregar máquina:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/machines/${id}/events?limit=30`);
      const json = await res.json();
      if (json.success) setEvents(json.data);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
    }
  };

  const fetchProduction = async () => {
    try {
      const res = await fetch(`/api/machines/${id}/production?period=day`);
      const json = await res.json();
      if (json.success && json.data.intervals) {
        setProductionData(json.data.intervals.map((i: Record<string, unknown>) => ({
          time: new Date(i.interval_start as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          produced: Number(i.pieces) || 0,
          target: 0,
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar produção:', err);
    }
  };

  // Real-time updates
  const handleMotionEvent = useCallback((msg: WSMessage) => {
    const payload = msg.data;
    if (payload.kpis) setKpis(payload.kpis as unknown as ShiftKpis);

    setMachine(prev => prev ? { ...prev, status: 'online' as MachineStatus, last_seen: msg.timestamp } : prev);

    // Add to events feed
    setEvents(prev => [{
      id: `live-${Date.now()}`,
      machine_id: msg.machine_id,
      device_id: (payload.device_id as string) || null,
      event_type: payload.event_type as MachineEvent['event_type'] || 'motion',
      intensity: (payload.intensity as number) || 0,
      zone: (payload.zone as MachineEvent['zone']) || null,
      snapshot_url: null,
      pieces_count: (payload.pieces_count as number) || null,
      cycle_time_seconds: null,
      uptime_seconds: null,
      raw_payload: null,
      created_at: msg.timestamp,
    }, ...prev].slice(0, 50));

    // Update zones
    if (payload.zone && payload.intensity) {
      setZones(prev => ({
        ...prev,
        [payload.zone as string]: Math.min((payload.intensity as number), 1),
      }));
    }
  }, []);

  const handleProductionUpdate = useCallback((msg: WSMessage) => {
    if (msg.data.kpis) setKpis(msg.data.kpis as unknown as ShiftKpis);
  }, []);

  const handleMachineStatus = useCallback((msg: WSMessage) => {
    setMachine(prev => prev ? {
      ...prev,
      status: (msg.data.status as MachineStatus) || prev.status,
      last_seen: msg.timestamp,
    } : prev);
  }, []);

  const { connectionState } = useMachineWebSocket({
    machineId: id,
    onMotionEvent: handleMotionEvent,
    onProductionUpdate: handleProductionUpdate,
    onMachineStatus: handleMachineStatus,
  });

  // KPI color helpers
  const kpiColor = (val: number, thresholds: [number, number]) =>
    val >= thresholds[1] ? 'green' as const : val >= thresholds[0] ? 'amber' as const : 'red' as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
        Máquina não encontrada
      </div>
    );
  }

  const lastSeenStr = machine.last_seen
    ? new Date(machine.last_seen).toLocaleString('pt-BR')
    : 'Nunca';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ZONA 1 — Header + KPIs */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link
                href="/maquinas"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  {machine.name}
                  <span className="text-xs text-gray-500 font-normal">{machine.machine_code}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    machine.status === 'online' ? 'bg-green-500/10 text-green-400'
                    : machine.status === 'idle' ? 'bg-amber-500/10 text-amber-400'
                    : machine.status === 'alert' ? 'bg-red-500/10 text-red-400'
                    : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      machine.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-current'
                    }`} />
                    {machine.status === 'online' ? 'OPERANDO' : machine.status === 'idle' ? 'PARADA' : machine.status === 'alert' ? 'ALERTA' : 'OFFLINE'}
                  </span>
                </h1>
                <p className="text-xs text-gray-500">
                  {machine.location} &middot; Última atividade: {lastSeenStr}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-xs ${
                connectionState === 'connected' ? 'text-green-400' : 'text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionState === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'
                }`} />
                {connectionState === 'connected' ? 'Ao vivo' : 'Offline'}
              </span>
              <Link
                href={`/maquinas/${id}/configurar`}
                className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded transition-colors"
              >
                Configurar
              </Link>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Peças Produzidas"
              value={kpis?.pieces_produced ?? 0}
              unit={`/ ${kpis?.pieces_target ?? machine.daily_target}`}
              color={kpiColor(kpis?.atingimento_pct ?? 0, [50, 80])}
            />
            <KpiCard
              label="Eficiência"
              value={`${kpis?.efficiency_pct ?? 0}`}
              unit="%"
              color={kpiColor(kpis?.efficiency_pct ?? 0, [50, 80])}
            />
            <KpiCard
              label="OEE"
              value={`${kpis?.oee_pct ?? 0}`}
              unit="%"
              color={kpiColor(kpis?.oee_pct ?? 0, [40, 70])}
            />
            <KpiCard
              label="Ciclo Médio"
              value={kpis?.avg_cycle_time_seconds ?? '--'}
              unit="seg"
              color="blue"
            />
          </div>
        </div>
      </header>

      {/* ZONA 2 — Camera + Operator + Events */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Left: Camera + Zones (60%) */}
          <div className="lg:col-span-3 space-y-4">
            <CameraFeed
              machineId={id}
              refreshInterval={3000}
              status={machine.status}
              lastSeen={machine.last_seen}
            />
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <MotionZones zones={zones} />
            </div>
          </div>

          {/* Right: Operator + State + Events (40%) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Operator Card */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Operador
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Nome</span>
                  <span className="text-sm text-white font-medium">{machine.operator_name || 'Não definido'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Turno</span>
                  <span className="text-sm text-white">{machine.operator_shift || '-'} ({machine.shift_start} - {machine.shift_end})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Presença</span>
                  <span className={`text-sm font-medium ${
                    (kpis?.operator_presence_pct ?? 0) >= 70 ? 'text-green-400'
                    : (kpis?.operator_presence_pct ?? 0) >= 40 ? 'text-amber-400'
                    : 'text-red-400'
                  }`}>{kpis?.operator_presence_pct ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Peças/hora</span>
                  <span className="text-sm text-blue-400 font-medium">{kpis?.pieces_per_hour ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Machine State Card */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Estado da Máquina
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Meta diária</span>
                  <span className="text-sm text-white">{machine.daily_target} pç</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Atingimento</span>
                  <span className={`text-sm font-bold ${
                    (kpis?.atingimento_pct ?? 0) >= 80 ? 'text-green-400'
                    : (kpis?.atingimento_pct ?? 0) >= 50 ? 'text-amber-400'
                    : 'text-red-400'
                  }`}>{kpis?.atingimento_pct ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Eventos movimento</span>
                  <span className="text-sm text-white">{kpis?.total_motion_events ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Eventos parada</span>
                  <span className="text-sm text-amber-400">{kpis?.idle_events ?? 0}</span>
                </div>
                {/* Gauge-like progress */}
                <div className="mt-3">
                  <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="absolute h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(kpis?.atingimento_pct ?? 0, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                    <span>0</span>
                    <span>{machine.daily_target} pç</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Events Feed */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Últimos Eventos
              </h3>
              <EventFeed events={events} maxItems={10} />
            </div>
          </div>
        </div>

        {/* ZONA 3 — Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
              Produção por Intervalo (15min)
            </h3>
            <ProductionChart
              data={productionData}
              target={machine.daily_target}
            />
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
              Histórico de Eventos
            </h3>
            <EventFeed events={events} maxItems={20} />
          </div>
        </div>
      </main>
    </div>
  );
}
