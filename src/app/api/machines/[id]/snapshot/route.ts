import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';
import { fetchCameraSnapshot } from '@/lib/machines/camera-service';

export const dynamic = 'force-dynamic';

// GET /api/machines/:id/snapshot — Proxy camera snapshot from ESP32-CAM
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  try {
    const result = await query(
      'SELECT cam_ip, cam_port, status FROM machines WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    const { cam_ip, cam_port } = result.rows[0];

    if (!cam_ip) {
      return NextResponse.json(
        { success: false, error: 'Câmera não configurada' },
        { status: 404 }
      );
    }

    const snapshot = await fetchCameraSnapshot(cam_ip, cam_port || 80);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: 'Câmera inacessível' },
        { status: 503 }
      );
    }

    return new Response(snapshot.buffer, {
      headers: {
        'Content-Type': snapshot.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[MACHINES] Erro ao capturar snapshot:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao capturar snapshot' },
      { status: 500 }
    );
  }
}
