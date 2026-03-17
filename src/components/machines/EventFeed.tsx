'use client';

import { useState } from 'react';
import type { MachineEvent, EventType } from '@/types/machines';

interface EventFeedProps {
  events: MachineEvent[];
  maxItems?: number;
}

const typeIcons: Record<EventType, { icon: string; color: string; label: string }> = {
  motion: { icon: '⚡', color: 'text-green-400', label: 'Movimento' },
  idle: { icon: '⏸', color: 'text-amber-400', label: 'Parada' },
  production: { icon: '📦', color: 'text-blue-400', label: 'Produção' },
  heartbeat: { icon: '💓', color: 'text-gray-500', label: 'Heartbeat' },
};

export default function EventFeed({ events, maxItems = 20 }: EventFeedProps) {
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  const filtered = events
    .filter(e => filter === 'all' || e.event_type === filter)
    .slice(0, maxItems);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {(['all', 'motion', 'idle', 'production'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              filter === type
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            {type === 'all' ? 'Todos' : typeIcons[type].label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="space-y-1 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
        {filtered.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-4">
            Nenhum evento registrado
          </div>
        )}
        {filtered.map((event, idx) => {
          const meta = typeIcons[event.event_type] || typeIcons.motion;
          const time = new Date(event.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });

          return (
            <div
              key={event.id || idx}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-800/50 hover:bg-gray-800 transition-colors animate-fadeIn"
            >
              <span className="text-sm">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-medium ${meta.color}`}>
                  {meta.label}
                </span>
                {event.zone && event.zone !== 'ALL' && (
                  <span className="text-xs text-gray-500 ml-1.5">{event.zone}</span>
                )}
                {event.pieces_count != null && event.pieces_count > 0 && (
                  <span className="text-xs text-blue-400 ml-1.5">+{event.pieces_count} pç</span>
                )}
                {event.intensity > 0 && (
                  <span className="text-xs text-gray-500 ml-1.5">
                    {Math.round(event.intensity * 100)}%
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-600 font-mono shrink-0">{time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
