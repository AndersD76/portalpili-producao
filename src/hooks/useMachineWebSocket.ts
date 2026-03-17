'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSMessage, WSConnectionState, MachineWSOptions } from '@/types/machines';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

/**
 * Real-time machine events hook using Server-Sent Events (SSE).
 * API-compatible with WebSocket interface — uses SSE under the hood
 * for compatibility with Next.js standalone deployment.
 */
export function useMachineWebSocket(options: MachineWSOptions) {
  const { machineId, onMotionEvent, onProductionUpdate, onMachineStatus, onHeartbeat } = options;
  const [connectionState, setConnectionState] = useState<WSConnectionState>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlersRef = useRef({ onMotionEvent, onProductionUpdate, onMachineStatus, onHeartbeat });
  handlersRef.current = { onMotionEvent, onProductionUpdate, onMachineStatus, onHeartbeat };

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = machineId === 'dashboard'
      ? '/api/machines/stream'
      : `/api/machines/${machineId}/stream`;

    setConnectionState('connecting');

    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnectionState('connected');
      reconnectAttemptRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        if (msg.type === 'connected' as string) return; // Initial connection ack

        switch (msg.type) {
          case 'motion_event':
            handlersRef.current.onMotionEvent(msg);
            break;
          case 'production_update':
            handlersRef.current.onProductionUpdate(msg);
            break;
          case 'machine_status':
            handlersRef.current.onMachineStatus(msg);
            break;
          case 'heartbeat':
            handlersRef.current.onHeartbeat?.(msg);
            break;
        }
      } catch {
        // Ignore parse errors (ping frames, etc.)
      }
    };

    es.onerror = () => {
      es.close();
      setConnectionState('disconnected');

      // Reconnect with exponential backoff
      const attempt = Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1);
      const delay = RECONNECT_DELAYS[attempt];
      reconnectAttemptRef.current++;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [machineId]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connect]);

  return { connectionState };
}
