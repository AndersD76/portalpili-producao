import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';
import { getSnapshot, setSnapshot } from '@/lib/machines/snapshot-cache';

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
      'SELECT api_key FROM machines WHERE id = $1',
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

    return NextResponse.json({ success: true, size: buffer.length });
  } catch (error) {
    console.error('[SNAPSHOT] Erro ao receber snapshot:', error);
    return NextResponse.json({ success: false, error: 'Erro ao processar snapshot' }, { status: 500 });
  }
}
