import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSnapshot, setSnapshot } from '@/lib/machines/snapshot-cache';
import { analyzeMachineSnapshot } from '@/lib/machines/vision-analyzer';
import { machineEventBus } from '@/lib/machines/event-bus';

export const dynamic = 'force-dynamic';

// GET /api/machines/:id/snapshot — Serve cached snapshot uploaded by ESP32
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  const cached = getSnapshot(id);
  if (cached) {
    return new Response(new Uint8Array(cached.buffer), {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Snapshot-Age': `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
      },
    });
  }

  return NextResponse.json(
    { success: false, error: 'Snapshot indisponível' },
    { status: 404 }
  );
}

// POST /api/machines/:id/snapshot — ESP32 uploads snapshot (API key auth)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth via API key
  const apiKey = request.headers.get('X-Pili-Key');
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key ausente' }, { status: 401 });
  }

  try {
    const machineResult = await query(
      'SELECT api_key, operator_shift, camera_rotation FROM machines WHERE id = $1',
      [id]
    );

    if (machineResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Máquina não encontrada' }, { status: 404 });
    }

    if (machineResult.rows[0].api_key !== apiKey) {
      return NextResponse.json({ success: false, error: 'API key inválida' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return NextResponse.json({ success: false, error: 'Imagem vazia' }, { status: 400 });
    }

    setSnapshot(id, buffer, contentType);

    const cameraRotation = machineResult.rows[0].camera_rotation || 0;

    // Run vision analysis in background (Python engine handles throttling)
    analyzeMachineSnapshot(id, buffer, cameraRotation).then(async (analysis) => {
      if (!analysis) return;

      // Map vision result to machine status
      const statusMap = {
        operating: 'online' as const,
        idle: 'idle' as const,
        off: 'offline' as const,
        unknown: undefined,
      };
      const newStatus = statusMap[analysis.machine_status];

      // Update machine status based on vision
      if (newStatus) {
        await query(
          'UPDATE machines SET status = $1, last_seen = NOW(), updated_at = NOW() WHERE id = $2',
          [newStatus, id]
        );
      }

      // Save vision event to database
      await query(`
        INSERT INTO machine_events (
          machine_id, device_id, event_type, intensity, zone,
          pieces_count, raw_payload
        ) VALUES ($1, 'vision-engine', 'vision', $2, 'ALL', 0, $3)
      `, [
        id,
        analysis.confidence === 'high' ? 1.0 : analysis.confidence === 'medium' ? 0.7 : 0.3,
        JSON.stringify(analysis),
      ]);

      // Broadcast status update via SSE
      machineEventBus.publish({
        type: 'machine_status',
        machine_id: id,
        timestamp: new Date().toISOString(),
        data: {
          status: newStatus,
          vision: analysis,
        } as never,
      });
    }).catch((err) => {
      console.error('[VISION] Background analysis error:', err);
    });

    return NextResponse.json({ success: true, size: buffer.length });
  } catch (error) {
    console.error('[SNAPSHOT] Erro ao receber snapshot:', error);
    return NextResponse.json({ success: false, error: 'Erro ao processar snapshot' }, { status: 500 });
  }
}
