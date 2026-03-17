// ============================================
// PILI_MAQ — Machine Monitoring Types
// ============================================

export type MachineStatus = 'online' | 'offline' | 'alert' | 'idle';
export type EventType = 'motion' | 'idle' | 'heartbeat' | 'production';
export type MotionZone = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'ALL';
export type Shift = 'A' | 'B' | 'C';
export type ProductionPeriod = 'shift' | 'day' | 'week';

// ---- Database Models ----

export interface Machine {
  id: string;
  name: string;
  machine_code: string;
  location: string | null;
  cam_ip: string | null;
  cam_port: number;
  api_key: string;
  operator_name: string | null;
  operator_shift: Shift | null;
  shift_start: string; // HH:MM
  shift_end: string;   // HH:MM
  daily_target: number;
  status: MachineStatus;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

export interface MachineEvent {
  id: string;
  machine_id: string;
  device_id: string | null;
  event_type: EventType;
  intensity: number;
  zone: MotionZone | null;
  snapshot_url: string | null;
  pieces_count: number | null;
  cycle_time_seconds: number | null;
  uptime_seconds: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ProductionRecord {
  id: string;
  machine_id: string;
  shift_date: string;
  shift: string;
  pieces_produced: number;
  pieces_target: number | null;
  total_motion_events: number;
  total_idle_events: number;
  avg_cycle_time: number | null;
  efficiency_pct: number | null;
  oee_pct: number | null;
  operator_name: string | null;
  created_at: string;
  updated_at: string;
}

// ---- API Payloads ----

export interface MotionEventPayload {
  machine_id: string;
  device_id: string;
  event_type: EventType;
  intensity: number;
  zone: MotionZone;
  snapshot_url?: string;
  pieces_count?: number;
  cycle_time_seconds?: number;
  timestamp: string;
  uptime_seconds: number;
}

export interface MachineCreatePayload {
  name: string;
  machine_code: string;
  location?: string;
  cam_ip?: string;
  cam_port?: number;
  operator_name?: string;
  operator_shift?: Shift;
  shift_start?: string;
  shift_end?: string;
  daily_target?: number;
}

export interface MachineUpdatePayload extends Partial<MachineCreatePayload> {
  status?: MachineStatus;
}

// ---- KPI Types ----

export interface ShiftKpis {
  pieces_produced: number;
  pieces_target: number;
  atingimento_pct: number;
  efficiency_pct: number;
  oee_pct: number;
  avg_cycle_time_seconds: number | null;
  pieces_per_hour: number;
  total_motion_events: number;
  idle_events: number;
  motion_by_zone: { Q1: number; Q2: number; Q3: number; Q4: number };
  operator_presence_pct: number;
}

export interface MachineWithKpis extends Machine {
  kpis: ShiftKpis | null;
}

// ---- WebSocket / SSE Message Types ----

export type WSMessageType = 'motion_event' | 'production_update' | 'heartbeat' | 'machine_status';

export interface WSMessage {
  type: WSMessageType;
  machine_id: string;
  timestamp: string;
  data: MotionEventPayload & { kpis?: ShiftKpis; status?: MachineStatus };
}

// ---- Hook Types ----

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface MachineWSOptions {
  machineId: string | 'dashboard';
  onMotionEvent: (data: WSMessage) => void;
  onProductionUpdate: (data: WSMessage) => void;
  onMachineStatus: (data: WSMessage) => void;
  onHeartbeat?: (data: WSMessage) => void;
}

// ---- Component Props ----

export interface ZoneIntensities {
  Q1: number;
  Q2: number;
  Q3: number;
  Q4: number;
}

export interface ProductionDataPoint {
  time: string;
  produced: number;
  target: number;
}

export interface SparklinePoint {
  value: number;
}
