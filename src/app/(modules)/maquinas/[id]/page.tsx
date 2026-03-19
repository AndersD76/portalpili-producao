'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CameraFeed from '@/components/machines/CameraFeed';
import { useMachineWebSocket } from '@/hooks/useMachineWebSocket';
import type {
  Machine, WSMessage,
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
  uptime?: {
    operating_pct: number;
    idle_pct: number;
    off_pct: number;
    operator_presence_pct: number;
    total_transitions: number;
    current_state_duration_min: number;
  };
  training?: {
    operating?: number;
    idle?: number;
    off?: number;
    total?: number;
    ready?: boolean;
  };
}

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authenticated } = useAuth();
  const router = useRouter();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [vision, setVision] = useState<VisionData | null>(null);
  const [rotation, setRotation] = useState(0);
  const [motionHistory, setMotionHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authenticated) {
      router.push('/login');
      return;
    }
    fetchMachineData();
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
          setMotionHistory(prev => [...prev.slice(-29), json.data.vision.motion?.intensity ?? 0]);
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

  const handleMotionEvent = useCallback((msg: WSMessage) => {
    setMachine(prev => prev ? { ...prev, status: 'online' as MachineStatus, last_seen: msg.timestamp } : prev);
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

  const uptime = vision?.uptime;
  const training = vision?.training;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
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

          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Em Movimento</p>
              <p className={`text-2xl font-bold mt-1 ${
                (uptime?.operating_pct ?? 0) >= 60 ? 'text-green-400' :
                (uptime?.operating_pct ?? 0) >= 30 ? 'text-amber-400' : 'text-gray-500'
              }`}>{uptime?.operating_pct ?? 0}<span className="text-sm ml-0.5">%</span></p>
              <p className="text-[10px] text-gray-600 mt-0.5">do tempo monitorado</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Parado</p>
              <p className={`text-2xl font-bold mt-1 ${
                (uptime?.idle_pct ?? 0) + (uptime?.off_pct ?? 0) >= 60 ? 'text-red-400' :
                (uptime?.idle_pct ?? 0) + (uptime?.off_pct ?? 0) >= 30 ? 'text-amber-400' : 'text-green-400'
              }`}>{((uptime?.idle_pct ?? 0) + (uptime?.off_pct ?? 0)).toFixed(1)}<span className="text-sm ml-0.5">%</span></p>
              <p className="text-[10px] text-gray-600 mt-0.5">parado ou desligado</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Sem Presença</p>
              <p className={`text-2xl font-bold mt-1 ${
                (100 - (uptime?.operator_presence_pct ?? 0)) >= 60 ? 'text-red-400' :
                (100 - (uptime?.operator_presence_pct ?? 0)) >= 30 ? 'text-amber-400' : 'text-green-400'
              }`}>{(100 - (uptime?.operator_presence_pct ?? 0)).toFixed(1)}<span className="text-sm ml-0.5">%</span></p>
              <p className="text-[10px] text-gray-600 mt-0.5">sem operador detectado</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Left: Camera + Charts (60%) */}
          <div className="lg:col-span-3 space-y-4">
            <CameraFeed
              machineId={id}
              refreshInterval={3000}
              status={machine.status}
              lastSeen={machine.last_seen}
              rotation={rotation}
              onRotate={handleRotate}
            />

            {/* Distribuição de Estado - Stacked Bar */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Distribuição de Estado
              </h3>
              <div className="space-y-3">
                {/* Stacked bar */}
                <div className="h-8 rounded-lg overflow-hidden flex">
                  {(uptime?.operating_pct ?? 0) > 0 && (
                    <div
                      className="bg-green-500 flex items-center justify-center transition-all duration-700"
                      style={{ width: `${uptime?.operating_pct ?? 0}%` }}
                    >
                      {(uptime?.operating_pct ?? 0) > 10 && (
                        <span className="text-[10px] font-bold text-white">{uptime?.operating_pct}%</span>
                      )}
                    </div>
                  )}
                  {(uptime?.idle_pct ?? 0) > 0 && (
                    <div
                      className="bg-amber-500 flex items-center justify-center transition-all duration-700"
                      style={{ width: `${uptime?.idle_pct ?? 0}%` }}
                    >
                      {(uptime?.idle_pct ?? 0) > 10 && (
                        <span className="text-[10px] font-bold text-white">{uptime?.idle_pct}%</span>
                      )}
                    </div>
                  )}
                  {(uptime?.off_pct ?? 0) > 0 && (
                    <div
                      className="bg-gray-600 flex items-center justify-center transition-all duration-700"
                      style={{ width: `${uptime?.off_pct ?? 0}%` }}
                    >
                      {(uptime?.off_pct ?? 0) > 10 && (
                        <span className="text-[10px] font-bold text-white">{uptime?.off_pct}%</span>
                      )}
                    </div>
                  )}
                  {(!uptime || (uptime.operating_pct === 0 && uptime.idle_pct === 0 && uptime.off_pct === 0)) && (
                    <div className="bg-gray-800 w-full flex items-center justify-center">
                      <span className="text-[10px] text-gray-500">Coletando dados...</span>
                    </div>
                  )}
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                    <span className="text-gray-400">Operando</span>
                    <span className="text-white font-medium">{uptime?.operating_pct ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                    <span className="text-gray-400">Parada</span>
                    <span className="text-white font-medium">{uptime?.idle_pct ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-gray-600" />
                    <span className="text-gray-400">Desligada</span>
                    <span className="text-white font-medium">{uptime?.off_pct ?? 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Motion Timeline - Mini sparkline */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Intensidade de Movimento
                </h3>
                <span className="text-xs text-gray-500">
                  {vision?.motion?.intensity !== undefined
                    ? `${(vision.motion.intensity * 100).toFixed(1)}%`
                    : '--'}
                </span>
              </div>
              {/* Sparkline chart */}
              <div className="flex items-end gap-[2px] h-16">
                {motionHistory.length > 0 ? (
                  motionHistory.map((val, i) => {
                    const height = Math.max(2, Math.min(val * 100 * 8, 100));
                    const isLast = i === motionHistory.length - 1;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all duration-300 ${
                          val > 0.05 ? 'bg-green-500' :
                          val > 0.01 ? 'bg-amber-500' :
                          'bg-gray-700'
                        } ${isLast ? 'opacity-100' : 'opacity-60'}`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })
                ) : (
                  Array.from({ length: 30 }).map((_, i) => (
                    <div key={i} className="flex-1 bg-gray-800 rounded-t" style={{ height: '4%' }} />
                  ))
                )}
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>{motionHistory.length > 0 ? `${motionHistory.length * 10}s atrás` : ''}</span>
                <span>agora</span>
              </div>
            </div>

            {/* Zonas de Movimento */}
            {vision && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
                <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                  Zonas de Movimento
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(vision.motion.zones).map(([zone, value]) => (
                    <div key={zone} className="bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-300">{zone}</span>
                        <span className={`text-sm font-bold ${
                          value > 0.05 ? 'text-green-400' : value > 0.01 ? 'text-amber-400' : 'text-gray-600'
                        }`}>{(value * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            value > 0.05 ? 'bg-green-500' : value > 0.01 ? 'bg-amber-500' : 'bg-gray-600'
                          }`}
                          style={{ width: `${Math.min(value * 100 * 5, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Status + Operator + Events (40%) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Status da Máquina */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Status da Máquina
              </h3>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  statusColor === 'green' ? 'bg-green-500/20 ring-2 ring-green-500/30' :
                  statusColor === 'amber' ? 'bg-amber-500/20 ring-2 ring-amber-500/30' :
                  'bg-gray-500/20 ring-2 ring-gray-500/30'
                }`}>
                  <div className={`w-6 h-6 rounded-full ${
                    statusColor === 'green' ? 'bg-green-400 animate-pulse' :
                    statusColor === 'amber' ? 'bg-amber-400' : 'bg-gray-600'
                  }`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${
                    statusColor === 'green' ? 'text-green-400' :
                    statusColor === 'amber' ? 'text-amber-400' : 'text-gray-500'
                  }`}>{statusLabel}</p>
                  <p className="text-xs text-gray-500">
                    Confiança: <span className={
                      vision?.confidence === 'high' ? 'text-green-400' :
                      vision?.confidence === 'medium' ? 'text-amber-400' : 'text-gray-400'
                    }>{vision?.confidence === 'high' ? 'Alta' :
                       vision?.confidence === 'medium' ? 'Média' :
                       vision?.confidence === 'low' ? 'Baixa' : '--'}</span>
                  </p>
                </div>
              </div>

              {/* Observações */}
              {vision?.observations && (
                <div className="bg-gray-800/50 rounded-lg p-3 mt-2">
                  <p className="text-xs text-gray-300 leading-relaxed">{vision.observations}</p>
                </div>
              )}

              {/* Anomalias */}
              {vision?.anomalies && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs font-medium text-red-400">ALERTA</p>
                  <p className="text-xs text-red-300 mt-1">{vision.anomalies}</p>
                </div>
              )}
            </div>

            {/* Operador */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Operador
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                  vision?.operator_present
                    ? 'bg-blue-500/20 ring-2 ring-blue-500/30'
                    : 'bg-gray-700/50 ring-2 ring-gray-600/30'
                }`}>
                  {vision?.operator_present ? (
                    <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${
                    vision?.operator_present ? 'text-blue-400' : 'text-gray-500'
                  }`}>
                    {vision?.operator_present
                      ? `${vision.operator_count} pessoa${vision.operator_count > 1 ? 's' : ''} detectada${vision.operator_count > 1 ? 's' : ''}`
                      : 'Nenhum operador detectado'}
                  </p>
                  {vision?.operator_present && vision.operator_zone !== 'unknown' && (
                    <p className="text-xs text-gray-500">Zona: {vision.operator_zone}</p>
                  )}
                </div>
              </div>

              {/* Presence bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Presença no período</span>
                  <span className="text-blue-400 font-medium">{uptime?.operator_presence_pct ?? 0}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${uptime?.operator_presence_pct ?? 0}%` }}
                  />
                </div>
              </div>

            </div>

            {/* Motion Metrics */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">
                Métricas de Movimento
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {vision ? (vision.motion.intensity * 100).toFixed(1) : '0.0'}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">% pixels ativos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {vision ? vision.motion.flow_magnitude.toFixed(2) : '0.00'}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase">fluxo óptico</p>
                </div>
              </div>
            </div>

            {/* Training Progress */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                  Treinamento IA
                </h3>
                {training?.ready && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">PRONTO</span>
                )}
              </div>
              <div className="space-y-2">
                {['operating', 'idle', 'off'].map((state) => {
                  const count = (training as Record<string, number>)?.[state] ?? 0;
                  const pct = Math.min(count / 50 * 100, 100);
                  const label = state === 'operating' ? 'Operando' : state === 'idle' ? 'Parada' : 'Desligada';
                  const color = state === 'operating' ? 'bg-green-500' : state === 'idle' ? 'bg-amber-500' : 'bg-gray-500';
                  return (
                    <div key={state}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{label}</span>
                        <span className="text-gray-500">{count}/50 amostras</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-3">
                Coleta automática de amostras de alta confiança para auto-aperfeiçoamento
              </p>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
