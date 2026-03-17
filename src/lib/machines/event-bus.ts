// ============================================
// PILI_MAQ — In-memory Event Bus for SSE broadcast
// Single-process pub/sub (Railway standalone mode)
// For multi-instance: replace with PostgreSQL LISTEN/NOTIFY
// ============================================

import { EventEmitter } from 'events';

export type MachineEventData = {
  type: 'motion_event' | 'production_update' | 'heartbeat' | 'machine_status';
  machine_id: string;
  timestamp: string;
  data: Record<string, unknown>;
};

class MachineEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(200); // Support many concurrent SSE connections
  }

  /** Publish event for a specific machine + dashboard */
  publish(event: MachineEventData) {
    this.emitter.emit(`machine:${event.machine_id}`, event);
    this.emitter.emit('dashboard', event);
  }

  /** Subscribe to events for a specific machine */
  subscribeMachine(machineId: string, handler: (event: MachineEventData) => void): () => void {
    this.emitter.on(`machine:${machineId}`, handler);
    return () => {
      this.emitter.off(`machine:${machineId}`, handler);
    };
  }

  /** Subscribe to all machine events (dashboard) */
  subscribeDashboard(handler: (event: MachineEventData) => void): () => void {
    this.emitter.on('dashboard', handler);
    return () => {
      this.emitter.off('dashboard', handler);
    };
  }

  /** Get listener count for monitoring */
  getListenerCount(channel: string): number {
    return this.emitter.listenerCount(channel);
  }
}

// Singleton — survives across API route invocations in standalone mode
const globalForBus = globalThis as unknown as { machineEventBus?: MachineEventBus };
export const machineEventBus = globalForBus.machineEventBus ?? new MachineEventBus();
globalForBus.machineEventBus = machineEventBus;
