'use client';

import type { ZoneIntensities } from '@/types/machines';

interface MotionZonesProps {
  zones: ZoneIntensities;
}

function getZoneColor(intensity: number): string {
  if (intensity >= 0.7) return 'bg-red-500';
  if (intensity >= 0.4) return 'bg-amber-500';
  if (intensity > 0) return 'bg-green-500';
  return 'bg-gray-700';
}

function getZoneTextColor(intensity: number): string {
  if (intensity >= 0.7) return 'text-red-400';
  if (intensity >= 0.4) return 'text-amber-400';
  if (intensity > 0) return 'text-green-400';
  return 'text-gray-500';
}

export default function MotionZones({ zones }: MotionZonesProps) {
  const entries = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(zone => ({
    zone,
    value: zones[zone] || 0,
  }));

  const maxZone = entries.reduce((max, curr) => curr.value > max.value ? curr : max, entries[0]);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
        Zonas de Movimento
      </div>
      {entries.map(({ zone, value }) => (
        <div key={zone} className="flex items-center gap-2">
          <span className={`text-xs font-mono w-6 ${
            zone === maxZone.zone && maxZone.value > 0 ? 'text-white font-bold' : 'text-gray-400'
          }`}>
            {zone}
          </span>
          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getZoneColor(value)} ${
                zone === maxZone.zone && maxZone.value > 0 ? 'shadow-lg' : ''
              }`}
              style={{ width: `${Math.max(value * 100, 0)}%` }}
            />
          </div>
          <span className={`text-xs font-mono w-10 text-right ${getZoneTextColor(value)}`}>
            {Math.round(value * 100)}%
          </span>
        </div>
      ))}
      {maxZone.value >= 0.7 && (
        <div className="flex items-center gap-1 text-red-400 text-xs mt-1 animate-pulse">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Alta intensidade em {maxZone.zone}
        </div>
      )}
    </div>
  );
}
