'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CameraFeed from '@/components/machines/CameraFeed';
import EventFeed from '@/components/machines/EventFeed';
import { useMachineWebSocket } from '@/hooks/useMachineWebSocket';
import type {
  Machine, MachineEvent, WSMessage,
  MachineStatus
} from '@/types/machines';

interface VisionData {
  machine_status: string;
  operator_present: boolean;
  operator_count: number;
  operator_zone: string;
  observations: string;
  anomalies: string | null;
  confidence: string;
  motion: {
    intensity: number;
    flow_magnitude: number;
    zones: Record<string, number>;
  };
}

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authenticated } = useAuth();
  const router = useRouter();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [events, setEvents] = useState<MachineEvent[]>([]);
  const [vision, setVision] = useState<VisionData | null>(null);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchMachineData();
    fetchEvents();

    // Poll vision data every 10s
    const interval = setInterval(fetchMachineData, 10000);
    return () => clearInterval(interval);
  }, [authenticated, router, id]);

  const fetchMachineData = async () => {
    try {
      const res = await fetch(`/api/machines/${id}`);
      const json = await res.json();
      if (json.success) {
        setMachine(json.data);
        if (json.data.vision) {
          setVision(json.data.vision);
        }
        if (json.data.camera_rotation !== undefined) {
          setRotation(json.data.camera_rotation || 0);
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

  // Real-time updates
  const handleMotionEvent = useCallback((msg: WSMessage) => {
    setMachine(prev => prev ? { ...prev, status: 'online' as MachineStatus, last_seen: msg.timestamp } : prev);

    setEvents(prev => [{
      id: `live-${Date.now()}`,
      machine_id: msg.machine_id,
      device_id: (msg.data.device_id as string) || null,
      event_type: msg.data.event_type as MachineEvent['event_type'] || 'motion',
      intensity: (msg.data.intensity as number) || 0,
      zone: (msg.data.zone as MachineEvent['zone']) || null,
      snapshot_url: null,
      pieces_count: null,
      cycle_time_seconds: null,
      uptime_seconds: null,
      raw_payload: null,
      created_at: msg.timestamp,
    }, ...prev].slice(0, 50));
  }, []);

  const handleMachineStatus = useCallback((msg: WSMessage) => {
    setMachine(prev => prev ? {
      ...prev,
      status: (msg.data.status as MachineStatus) || prev.status,
      last_seen: msg.timestamp,
    } : prev);
  }, []);

  const handleProductionUpdate = useCallback(() => {}, []);

  const handleRotate = async () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    try {
      await fetch(`/api/machines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_rotation: newRotation }),
      });
    } catch (err) {
      console.error('Erro ao salvar rotação:', err);
    }
  };

  const { connectionState } = useMachineWebSocket({
    machineId: id,
    onMotionEvent: handleMotionEvent,
    onProductionUpdate: handleProductionUpdate,
    onMachineStatus: handleMachineStatus,
  });

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

  const statusLabel = vision?.machine_status === 'operating' ? 'OPERANDO'
    : vision?.machine_status === 'idle' ? 'PARADA'
    : vision?.machine_status === 'off' ? 'DESLIGADA'
    : machine.status === 'online' ? 'ONLINE'
    : machine.status === 'idle' ? 'PARADA'
    : 'OFFLINE';

  const statusColor = vision?.machine_status === 'operating' ? 'green'
    : vision?.machine_status === 'idle' ? 'amber'
    : vision?.machine_status === 'off' ? 'gray'
    : machine.status === 'online' ? 'green'
    : 'gray';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/maquinas" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  {machine.name}
                  <span className="text-xs text-gray-500 font-normal">{machine.machine_code}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    statusColor === 'green' ? 'bg-green-500/10 text-green-400'
                    : statusColor === 'amber' ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      statusColor === 'green' ? 'bg-green-400 animate-pulse' : 'bg-current'
                    }`} />
                    {statusLabel}
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
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: Camera (60%) */}
          <div className="lg:col-span-3 space-y-4">
            <CameraFeed
              machineId={id}
              refreshInterval={3000}
              status={machine.status}
              lastSeen={machine.last_seen}
              rotation={rotation}
              onRotate={handleRotate}
            />

            {/* Observações da IA */}
            {vision && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                  Análise de Visão Computacional
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {vision.observations || 'Aguardando análise...'}
                </p>
                {vision.anomalies && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                    ⚠ {vision.anomalies}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Confiança: <span className={
                    vision.confidence === 'high' ? 'text-green-400' :
                    vision.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'
                  }>{vision.confidence === 'high' ? 'Alta' : vision.confidence === 'medium' ? 'Média' : 'Baixa'}</span></span>
                  <span>Movimento: {(vision.motion.intensity * 100).toFixed(1)}%</span>
                  <span>Fluxo óptico: {vision.motion.flow_magnitude.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Status cards (40%) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status da Máquina */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Status da Máquina
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  statusColor === 'green' ? 'bg-green-500/20' :
                  statusColor === 'amber' ? 'bg-amber-500/20' : 'bg-gray-500/20'
                }`}>
                  <div className={`w-5 h-5 rounded-full ${
                    statusColor === 'green' ? 'bg-green-400 animate-pulse' :
                    statusColor === 'amber' ? 'bg-amber-400' : 'bg-gray-600'
                  }`} />
                </div>
                <div>
                  <p className={`text-lg font-bold ${
                    statusColor === 'green' ? 'text-green-400' :
                    statusColor === 'amber' ? 'text-amber-400' : 'text-gray-500'
                  }`}>{statusLabel}</p>
                  <p className="text-xs text-gray-500">Detectado por visão computacional</p>
                </div>
              </div>

              {/* Motion zones */}
              {vision && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase">Zonas de Movimento</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(vision.motion.zones).map(([zone, value]) => (
                      <div key={zone} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-6">{zone}</span>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              value > 0.05 ? 'bg-green-500' : value > 0.01 ? 'bg-amber-500' : 'bg-gray-700'
                            }`}
                            style={{ width: `${Math.min(value * 100 * 5, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10 text-right">
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Operador */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Operador
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                    vision?.operator_present ? 'bg-blue-500/20' : 'bg-gray-500/20'
                  }`}>
                    {vision?.operator_present ? '👤' : '○'}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      vision?.operator_present ? 'text-blue-400' : 'text-gray-500'
                    }`}>
                      {vision?.operator_present
                        ? `${vision.operator_count} pessoa${vision.operator_count > 1 ? 's' : ''} detectada${vision.operator_count > 1 ? 's' : ''}`
                        : 'Nenhum operador detectado'}
                    </p>
                    {vision?.operator_present && vision.operator_zone && (
                      <p className="text-xs text-gray-500">Posição: {vision.operator_zone}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Nome</span>
                  <span className="text-white">{machine.operator_name || 'Não definido'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Turno</span>
                  <span className="text-white">{machine.operator_shift || '-'} ({machine.shift_start} - {machine.shift_end})</span>
                </div>
              </div>
            </div>

            {/* Últimos Eventos */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Últimos Eventos
              </h3>
              <EventFeed events={events} maxItems={15} />
            </div>
          </div>
        </div>

        {/* Treinamento banner */}
        <div className="mt-6 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h4 className="text-sm font-medium text-blue-400">Modo Aprendizado</h4>
              <p className="text-xs text-gray-400 mt-1">
                O algoritmo está coletando dados e aprendendo os padrões desta máquina.
                Quanto mais tempo rodando, mais precisa será a detecção de estado (operando/parada/desligada).
                Métricas avançadas (OEE, produção, eficiência) serão habilitadas após treinamento.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
