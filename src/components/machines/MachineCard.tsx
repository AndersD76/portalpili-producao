'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import type { MachineWithKpis, MachineStatus } from '@/types/machines';

interface MachineCardProps {
  machine: MachineWithKpis;
  recentMotion?: boolean;
  onEdit?: (machine: MachineWithKpis) => void;
  onDelete?: (machine: MachineWithKpis) => void;
}

const statusConfig: Record<MachineStatus, { label: string; color: string; border: string; bg: string; dot: string }> = {
  online: { label: 'OPERANDO', color: 'text-green-700', border: 'border-l-green-500', bg: 'bg-green-50', dot: 'bg-green-500 animate-pulse' },
  idle: { label: 'PARADA', color: 'text-amber-700', border: 'border-l-amber-500', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  alert: { label: 'ALERTA', color: 'text-red-700', border: 'border-l-red-500', bg: 'bg-red-50', dot: 'bg-red-500 animate-pulse' },
  offline: { label: 'OFFLINE', color: 'text-gray-500', border: 'border-l-gray-400', bg: 'bg-gray-100', dot: 'bg-gray-400' },
};

export default function MachineCard({ machine, recentMotion = false, onEdit, onDelete }: MachineCardProps) {
  const config = statusConfig[machine.status] || statusConfig.offline;
  const kpis = machine.kpis;
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const imgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const atingimento = kpis ? kpis.atingimento_pct : 0;

  return (
    <div className={`relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-l-4 ${config.border} ${
      recentMotion ? 'ring-2 ring-green-400/50' : ''
    } hover:shadow-md transition-all`}>
      {/* Camera preview */}
      <div className="relative h-36 bg-gray-100">
        {imgSrc && machine.status !== 'offline' ? (
          <img
            src={imgSrc}
            alt={machine.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${config.bg} ${config.color} border border-current/10`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>

        {/* Menu button */}
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
            className="p-1.5 bg-white/80 hover:bg-white rounded-lg shadow-sm border border-gray-200 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40 z-20">
              <Link
                href={`/maquinas/${machine.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver detalhes
              </Link>
              <Link
                href={`/maquinas/${machine.id}/configurar`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configurar ESP32
              </Link>
              {onEdit && (
                <button
                  onClick={() => { setMenuOpen(false); onEdit(machine); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
              )}
              {onDelete && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(machine); }}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{machine.name}</h3>
            <p className="text-xs text-gray-500">{machine.machine_code} &middot; {machine.location || 'Sem local'}</p>
          </div>
        </div>

        {/* KPIs inline */}
        {kpis && (
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div>
              <div className="text-xs text-gray-400">Peças</div>
              <div className="text-sm font-bold text-gray-900">{kpis.pieces_produced}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Meta</div>
              <div className="text-sm font-bold text-gray-500">{kpis.pieces_target}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Efic.</div>
              <div className={`text-sm font-bold ${
                kpis.efficiency_pct >= 80 ? 'text-green-600'
                : kpis.efficiency_pct >= 50 ? 'text-amber-600'
                : 'text-red-600'
              }`}>{kpis.efficiency_pct}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">OEE</div>
              <div className={`text-sm font-bold ${
                kpis.oee_pct >= 70 ? 'text-green-600'
                : kpis.oee_pct >= 40 ? 'text-amber-600'
                : 'text-red-600'
              }`}>{kpis.oee_pct}%</div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Atingimento</span>
            <span className={`font-medium ${
              atingimento >= 80 ? 'text-green-600'
              : atingimento >= 50 ? 'text-amber-600'
              : 'text-red-600'
            }`}>{atingimento}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            Ver detalhes →
          </Link>
        </div>
      </div>
    </div>
  );
}
