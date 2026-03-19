// ============================================
// PILI_MAQ — Machine Vision Analyzer
// Calls Pili Vision Engine (Python/YOLOv11) for analysis
// ============================================

export interface MachineVisionResult {
  machine_status: 'operating' | 'idle' | 'off' | 'unknown';
  operator_present: boolean;
  operator_count: number;
  operator_zone: string;
  operator_near_machine: boolean;
  observations: string;
  anomalies: string | null;
  confidence: 'high' | 'medium' | 'low';
  motion: {
    intensity: number;
    flow_magnitude: number;
    zones: Record<string, number>;
  };
  oee: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
    operating_minutes: number;
    idle_minutes: number;
    off_minutes: number;
  };
  uptime: {
    operating_pct: number;
    idle_pct: number;
    off_pct: number;
    operator_presence_pct: number;
    total_transitions: number;
    current_state_duration_min: number;
  };
  training: {
    operating: number;
    idle: number;
    off: number;
    total: number;
    ready: boolean;
  };
}

// Cache last result per machine
const lastResult = new Map<string, MachineVisionResult>();

const VISION_ENGINE_URL = process.env.PILI_VISION_URL || 'http://localhost:8000';

export async function analyzeMachineSnapshot(
  machineId: string,
  imageBuffer: Buffer,
  cameraRotation: number = 0
): Promise<MachineVisionResult | null> {
  try {
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', blob, 'snapshot.jpg');
    formData.append('rotation', String(cameraRotation));

    const apiKey = process.env.PILI_VISION_API_KEY || '';
    const response = await fetch(`${VISION_ENGINE_URL}/analyze/${machineId}`, {
      method: 'POST',
      headers: {
        ...(apiKey ? { 'X-Pili-Key': apiKey } : {}),
      },
      body: formData,
    });

    if (response.status === 429) {
      return lastResult.get(machineId) || null;
    }

    if (!response.ok) {
      console.error('[VISION] Engine error:', response.status);
      return null;
    }

    const data = await response.json();

    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (data.confidence >= 0.8) confidence = 'high';
    else if (data.confidence < 0.5) confidence = 'low';

    const analysis: MachineVisionResult = {
      machine_status: data.machine_status,
      operator_present: data.operator_present,
      operator_count: data.operator_count || 0,
      operator_zone: data.operator_zone || 'unknown',
      operator_near_machine: data.operator_near_machine || false,
      observations: data.observations || '',
      anomalies: data.anomaly?.description || null,
      confidence,
      motion: data.motion || { intensity: 0, flow_magnitude: 0, zones: {} },
      oee: data.oee || {
        availability: 0, performance: 0, quality: 100,
        oee: 0, operating_minutes: 0, idle_minutes: 0, off_minutes: 0,
      },
      uptime: data.uptime || {
        operating_pct: 0, idle_pct: 0, off_pct: 0,
        operator_presence_pct: 0, total_transitions: 0, current_state_duration_min: 0,
      },
      training: data.training || {
        operating: 0, idle: 0, off: 0, total: 0, ready: false,
      },
    };

    lastResult.set(machineId, analysis);

    console.log(
      `[VISION] Machine ${machineId.substring(0, 8)}: status=${analysis.machine_status}, ` +
      `operator=${analysis.operator_present}, confidence=${analysis.confidence}, ` +
      `uptime=${analysis.uptime.operating_pct}%op/${analysis.uptime.operator_presence_pct}%pres`
    );

    return analysis;
  } catch (error) {
    console.error('[VISION] Analysis error:', error);
    return null;
  }
}

export function getLastAnalysis(machineId: string): MachineVisionResult | null {
  return lastResult.get(machineId) || null;
}
