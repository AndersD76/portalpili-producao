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
}

// Cache last result per machine
const lastResult = new Map<string, MachineVisionResult>();

const VISION_ENGINE_URL = process.env.PILI_VISION_URL || 'http://localhost:8000';

export async function analyzeMachineSnapshot(
  machineId: string,
  imageBuffer: Buffer
): Promise<MachineVisionResult | null> {
  try {
    // Send image to Pili Vision Engine as multipart/form-data
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('file', blob, 'snapshot.jpg');

    const apiKey = process.env.PILI_VISION_API_KEY || '';
    const response = await fetch(`${VISION_ENGINE_URL}/analyze/${machineId}`, {
      method: 'POST',
      headers: {
        ...(apiKey ? { 'X-Pili-Key': apiKey } : {}),
      },
      body: formData,
    });

    // Cooldown — the vision engine handles throttling
    if (response.status === 429) {
      return lastResult.get(machineId) || null;
    }

    if (!response.ok) {
      console.error('[VISION] Engine error:', response.status);
      return null;
    }

    const data = await response.json();

    // Map confidence from numeric to label
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
    };

    // Cache result
    lastResult.set(machineId, analysis);

    console.log(
      `[VISION] Machine ${machineId.substring(0, 8)}: status=${analysis.machine_status}, ` +
      `operator=${analysis.operator_present}, confidence=${analysis.confidence}, ` +
      `oee=${analysis.oee.oee}%`
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
