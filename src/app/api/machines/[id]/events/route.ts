import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/machines/:id/events — Paginated event history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const eventType = searchParams.get('type');

  try {
    let whereClause = 'WHERE me.machine_id = $1';
    const queryParams: unknown[] = [id];
    let paramIdx = 2;

    if (eventType) {
      whereClause += ` AND me.event_type = $${paramIdx}`;
      queryParams.push(eventType);
      paramIdx++;
    }

    queryParams.push(limit, offset);

    const result = await query(`
      SELECT me.*
      FROM machine_events me
      ${whereClause}
      ORDER BY me.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, queryParams);

    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM machine_events me
      ${whereClause}
    `, queryParams.slice(0, paramIdx - 1));

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
    });
  } catch (error) {
    console.error('[MACHINES] Erro ao buscar eventos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar eventos' },
      { status: 500 }
    );
  }
}
