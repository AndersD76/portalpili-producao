'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import type { MachineWithKpis, MachineStatus } from '@/types/machines';

interface MachineCardProps {
  machine: MachineWithKpis;
  recentMotion?: boolean;
}

const statusConfig: Record<MachineStatus, { label: string; color: string; border: string; bg: string }> = {
  online: { label: 'OPERANDO', color: 'text-green-400', border: 'border-l-green-500', bg: 'bg-green-500/10' },
  idle: { label: 'PARADA', color: 'text-amber-400', border: 'border-l-amber-500', bg: 'bg-amber-500/10' },
  alert: { label: 'ALERTA', color: 'text-red-400', border: 'border-l-red-500', bg: 'bg-red-500/10' },
  offline: { label: 'OFFLINE', color: 'text-gray-500', border: 'border-l-gray-600', bg: 'bg-gray-500/10' },
};

export default function MachineCard({ machine, recentMotion = false }: MachineCardProps) {
  const config = statusConfig[machine.status] || statusConfig.offline;
  const kpis = machine.kpis;
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const imgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Camera preview refresh
  useEffect(() => {
    if (machine.status === 'offline') return;

    const fetchImg = () => {
      setImgSrc(`/api/machines/${machine.id}/snapshot?t=${Date.now()}`);
    };
    fetchImg();
    imgIntervalRef.current = setInterval(fetchImg, 5000);

    return () => {
      if (imgIntervalRef.current) clearInterval(imgIntervalRef.current);
    };
  }, [machine.id, machine.status]);

  const atingimento = kpis ? kpis.atingimento_pct : 0;

  return (
    <div className={`relative bg-gray-900 rounded-lg border border-gray-800 overflow-hidden border-l-4 ${config.border} ${
      recentMotion ? 'ring-2 ring-green-500/50 animate-pulse-border' : ''
    } hover:border-gray-700 transition-all`}>
      {/* Camera preview */}
      <div className="relative h-36 bg-gray-800">
        {imgSrc && machine.status !== 'offline' ? (
          <img
            src={imgSrc}
            alt={machine.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${config.bg} ${config.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              machine.status === 'online' ? 'bg-green-400 animate-pulse'
              : machine.status === 'idle' ? 'bg-amber-400'
              : machine.status === 'alert' ? 'bg-red-400 animate-pulse'
              : 'bg-gray-600'
            }`} />
            {config.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-white">{machine.name}</h3>
            <p className="text-xs text-gray-500">{machine.machine_code} &middot; {machine.location || 'Sem local'}</p>
          </div>
        </div>

        {/* KPIs inline */}
        {kpis && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div>
              <div className="text-xs text-gray-500">Peças</div>
              <div className="text-sm font-bold text-white">{kpis.pieces_produced}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Meta</div>
              <div className="text-sm font-bold text-gray-400">{kpis.pieces_target}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Efic.</div>
              <div className={`text-sm font-bold ${
                kpis.efficiency_pct >= 80 ? 'text-green-400'
                : kpis.efficiency_pct >= 50 ? 'text-amber-400'
                : 'text-red-400'
              }`}>{kpis.efficiency_pct}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">OEE</div>
              <div className={`text-sm font-bold ${
                kpis.oee_pct >= 70 ? 'text-green-400'
                : kpis.oee_pct >= 40 ? 'text-amber-400'
                : 'text-red-400'
              }`}>{kpis.oee_pct}%</div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Atingimento</span>
            <span className={`font-medium ${
              atingimento >= 80 ? 'text-green-400'
              : atingimento >= 50 ? 'text-amber-400'
              : 'text-red-400'
            }`}>{atingimento}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                atingimento >= 80 ? 'bg-green-500'
                : atingimento >= 50 ? 'bg-amber-500'
                : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(atingimento, 100)}%` }}
            />
          </div>
        </div>

        {/* Operator + action */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {machine.operator_name || 'Sem operador'} &middot; Turno {machine.operator_shift || '-'}
          </div>
          <Link
            href={`/maquinas/${machine.id}`}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Ver detalhes →
          </Link>
        </div>
      </div>
    </div>
  );
}
