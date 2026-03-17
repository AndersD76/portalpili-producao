import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calculateShiftKpis, upsertProductionRecord } from '@/lib/machines/kpi-service';
import { machineEventBus } from '@/lib/machines/event-bus';
import type { MotionEventPayload } from '@/types/machines';

export const dynamic = 'force-dynamic';

// POST /api/machines/:id/motion-events — Receive events from ESP32 (API key auth)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Authenticate via X-Pili-Key header (no JWT)
  const apiKey = request.headers.get('X-Pili-Key');
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API key ausente' },
      { status: 401 }
    );
  }

  try {
    // Validate API key against machine
    const machineResult = await query(
      'SELECT id, api_key, operator_name, operator_shift, daily_target FROM machines WHERE id = $1',
      [id]
    );

    if (machineResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    const machine = machineResult.rows[0];

    if (machine.api_key !== apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key inválida' },
        { status: 403 }
      );
    }

    const body: MotionEventPayload = await request.json();

    // Validate required fields
    if (!body.event_type || !body.device_id) {
      return NextResponse.json(
        { success: false, error: 'event_type e device_id são obrigatórios' },
        { status: 400 }
      );
    }

    // 1. Save event to database
    await query(`
      INSERT INTO machine_events (
        machine_id, device_id, event_type, intensity, zone,
        snapshot_url, pieces_count, cycle_time_seconds, uptime_seconds, raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      id, body.device_id, body.event_type,
      body.intensity || 0, body.zone || 'ALL',
      body.snapshot_url || null, body.pieces_count || null,
      body.cycle_time_seconds || null, body.uptime_seconds || 0,
      JSON.stringify(body),
    ]);

    // 2. Update machine status and last_seen
    const newStatus = body.event_type === 'idle' ? 'idle'
      : body.event_type === 'motion' || body.event_type === 'production' ? 'online'
      : undefined;

    if (newStatus) {
      await query(
        'UPDATE machines SET status = $1, last_seen = NOW(), updated_at = NOW() WHERE id = $2',
        [newStatus, id]
      );
    } else {
      await query(
        'UPDATE machines SET last_seen = NOW() WHERE id = $1',
        [id]
      );
    }

    // 3. Calculate current shift KPIs
    const today = new Date().toISOString().split('T')[0];
    const shift = machine.operator_shift || 'A';
    let kpis = null;

    try {
      kpis = await calculateShiftKpis(id, today, shift);
      await upsertProductionRecord(id, today, shift, kpis, machine.operator_name);
    } catch (e) {
      console.warn('[MACHINES] Erro ao calcular KPIs:', e);
    }

    // 4. Broadcast via event bus (SSE clients receive this)
    const msgType = body.event_type === 'production' ? 'production_update'
      : body.event_type === 'heartbeat' ? 'heartbeat'
      : body.event_type === 'idle' ? 'machine_status'
      : 'motion_event';

    machineEventBus.publish({
      type: msgType,
      machine_id: id,
      timestamp: body.timestamp || new Date().toISOString(),
      data: { ...body, kpis, status: newStatus },
    });

    return NextResponse.json({ success: true, kpis });
  } catch (error) {
    console.error('[MACHINES] Erro ao processar evento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar evento' },
      { status: 500 }
    );
  }
}
