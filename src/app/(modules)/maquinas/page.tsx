'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
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

const statusConfig: Record<MachineStatus, { label: string; color: string; border: string; bg: string; dot: string; ring: string }> = {
  online: { label: 'OPERANDO', color: 'text-green-700', border: 'border-green-500', bg: 'bg-green-50', dot: 'bg-green-500 animate-pulse', ring: 'ring-green-400/40' },
  idle: { label: 'PARADA', color: 'text-amber-700', border: 'border-amber-500', bg: 'bg-amber-50', dot: 'bg-amber-500', ring: 'ring-amber-400/40' },
  alert: { label: 'ALERTA', color: 'text-red-700', border: 'border-red-500', bg: 'bg-red-50', dot: 'bg-red-500 animate-pulse', ring: 'ring-red-400/40' },
  offline: { label: 'OFFLINE', color: 'text-gray-500', border: 'border-gray-300', bg: 'bg-gray-100', dot: 'bg-gray-400', ring: '' },
};

export default function ChaoFabricaDashboard() {
  const { authenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [machines, setMachines] = useState<MachineWithKpis[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentMotionIds, setRecentMotionIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [imgTimestamps, setImgTimestamps] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!authenticated) { router.push('/login'); return; }
    fetchMachines();
  }, [authLoading, authenticated, router]);

  // Refresh camera snapshots every 5s
  useEffect(() => {
    const iv = setInterval(() => {
      setImgTimestamps(prev => {
        const next: Record<string, number> = {};
        machines.forEach(m => { if (m.status !== 'offline') next[m.id] = Date.now(); });
        return { ...prev, ...next };
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [machines]);

  const fetchMachines = async () => {
    try {
      const res = await fetch('/api/machines');
      const json = await res.json();
      if (json.success) {
        setMachines(json.data);
        const ts: Record<string, number> = {};
        json.data.forEach((m: MachineWithKpis) => { ts[m.id] = Date.now(); });
        setImgTimestamps(ts);
      }
    } catch (err) {
      console.error('Erro ao carregar máquinas:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const onlineCount = machines.filter(m => m.status === 'online').length;
  const idleCount = machines.filter(m => m.status === 'idle').length;
  const alertCount = machines.filter(m => m.status === 'alert').length;
  const offlineCount = machines.filter(m => m.status === 'offline').length;
  const totalPieces = machines.reduce((sum, m) => sum + (m.kpis?.pieces_produced || 0), 0);
  const avgEfficiency = machines.length > 0
    ? Math.round(machines.reduce((sum, m) => sum + (m.kpis?.efficiency_pct || 0), 0) / machines.length)
    : 0;

  const filtered = machines.filter(m =>
    filterStatus === 'all' || m.status === filterStatus
  );

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
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              connectionState === 'connected'
                ? 'text-green-700 bg-green-50'
                : 'text-gray-500 bg-gray-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connectionState === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              {connectionState === 'connected' ? 'Tempo real' : 'Conectando...'}
            </span>
            <button
              onClick={() => { setLoading(true); fetchMachines(); }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition"
              title="Atualizar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{machines.length}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Máquinas</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Operando</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{idleCount + alertCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Paradas/Alerta</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{totalPieces}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Peças Hoje</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className={`text-2xl font-bold ${avgEfficiency >= 70 ? 'text-green-600' : avgEfficiency >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
              {avgEfficiency}%
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Eficiência Média</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 text-center">
            <div className="text-2xl font-bold text-gray-400">{offlineCount}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Offline</div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'Todas', count: machines.length },
            { key: 'online', label: 'Operando', count: onlineCount },
            { key: 'idle', label: 'Paradas', count: idleCount },
            { key: 'alert', label: 'Alerta', count: alertCount },
            { key: 'offline', label: 'Offline', count: offlineCount },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors font-medium ${
                filterStatus === f.key
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Machine grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            {machines.length === 0 ? 'Nenhuma máquina cadastrada' : 'Nenhuma máquina com esse filtro'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(machine => {
              const cfg = statusConfig[machine.status] || statusConfig.offline;
              const kpis = machine.kpis;
              const atingimento = kpis ? kpis.atingimento_pct : 0;
              const isMotion = recentMotionIds.has(machine.id);
              const imgTs = imgTimestamps[machine.id] || Date.now();

              return (
                <div
                  key={machine.id}
                  className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all hover:shadow-md ${
                    isMotion ? `ring-2 ${cfg.ring}` : ''
                  }`}
                >
                  {/* Camera feed */}
                  <div className="relative h-44 bg-gray-900">
                    {machine.status !== 'offline' ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/machines/${machine.id}/snapshot?t=${imgTs}`}
                          alt={machine.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          {isMotion && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-green-500 text-white animate-pulse">
                              ATIVIDADE
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
                          <h3 className="text-white font-semibold text-sm">{machine.name}</h3>
                          <p className="text-white/70 text-xs">{machine.machine_code} &middot; {machine.location || 'Sem local'}</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">Câmera offline</span>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <h3 className="text-gray-300 font-semibold text-sm">{machine.name}</h3>
                          <p className="text-gray-500 text-xs">{machine.machine_code}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KPIs */}
                  <div className="p-3">
                    {kpis ? (
                      <>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">{kpis.pieces_produced}</div>
                            <div className="text-[9px] text-gray-400 uppercase">Peças</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-400">{kpis.pieces_target}</div>
                            <div className="text-[9px] text-gray-400 uppercase">Meta</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-bold ${kpis.efficiency_pct >= 70 ? 'text-green-600' : kpis.efficiency_pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {kpis.efficiency_pct}%
                            </div>
                            <div className="text-[9px] text-gray-400 uppercase">Efic.</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-bold ${kpis.oee_pct >= 70 ? 'text-green-600' : kpis.oee_pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                              {kpis.oee_pct}%
                            </div>
                            <div className="text-[9px] text-gray-400 uppercase">OEE</div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-2">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-gray-400">Atingimento</span>
                            <span className={`font-semibold ${atingimento >= 80 ? 'text-green-600' : atingimento >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {atingimento}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${atingimento >= 80 ? 'bg-green-500' : atingimento >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(atingimento, 100)}%` }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-2 text-xs text-gray-400">Sem dados de produção</div>
                    )}

                    {/* Footer: operator + link */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 truncate max-w-[120px]">
                          {machine.operator_name || 'Sem operador'}
                        </span>
                        <span className="text-[10px] text-gray-400">T{machine.operator_shift || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/maquinas/${machine.id}/configurar`}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded transition"
                          title="Configurar"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/maquinas/${machine.id}`}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Detalhes →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
