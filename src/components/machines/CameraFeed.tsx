'use client';

import { useState, useRef } from 'react';

interface CameraFeedProps {
  machineId: string;
  refreshInterval?: number;
  showOverlay?: boolean;
  status?: string;
  lastSeen?: string | null;
}

export default function CameraFeed({
  machineId,
  showOverlay = true,
  status = 'offline',
  lastSeen,
}: CameraFeedProps) {
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // MJPEG stream URL — the browser handles multipart/x-mixed-replace natively
  const streamUrl = `/api/machines/${machineId}/video`;

  const isOnline = status === 'online' || status === 'idle';
  const lastSeenStr = lastSeen
    ? new Date(lastSeen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {/* Loading skeleton */}
      {!streamLoaded && !error && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center z-0">
          <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
      )}

      {/* MJPEG video stream */}
      {!error && (
        <img
          ref={imgRef}
          src={streamUrl}
          alt="Camera feed"
          className="w-full h-full object-cover"
          onLoad={() => setStreamLoaded(true)}
          onError={() => { setError(true); setStreamLoaded(false); }}
        />
      )}

      {/* Error / offline fallback */}
      {error && (
        <div className="absolute inset-0 bg-gray-800 flex flex-col items-center justify-center text-gray-500">
          <svg className="w-16 h-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728A9 9 0 015.636 5.636" />
          </svg>
          <span className="text-sm">Camera offline</span>
          <button
            onClick={() => { setError(false); setStreamLoaded(false); }}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Overlays */}
      {showOverlay && (
        <>
          {/* Top overlay: LIVE badge + timestamp */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
              isOnline ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-500'}`} />
              {isOnline ? 'AO VIVO' : 'OFFLINE'}
            </span>
            <span className="text-xs text-gray-300 bg-black/60 px-2 py-0.5 rounded">
              {lastSeenStr}
            </span>
          </div>

          {/* Bottom overlay: machine status */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              status === 'online' ? 'bg-green-600/80 text-white'
              : status === 'idle' ? 'bg-amber-500/80 text-white'
              : status === 'alert' ? 'bg-red-600/80 text-white'
              : 'bg-gray-700/80 text-gray-300'
            }`}>
              {status === 'online' ? 'OPERANDO'
                : status === 'idle' ? 'PARADA'
                : status === 'alert' ? 'ALERTA'
                : 'OFFLINE'}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
            }`} />
          </div>
        </>
      )}
    </div>
  );
}
