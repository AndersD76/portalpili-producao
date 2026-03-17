import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/machines/:id/production?period=shift|day|week
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'shift';

  try {
    let dateFilter: string;
    const today = new Date().toISOString().split('T')[0];

    switch (period) {
      case 'week': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = `shift_date >= '${weekAgo.toISOString().split('T')[0]}'`;
        break;
      }
      case 'day':
        dateFilter = `shift_date = '${today}'`;
        break;
      case 'shift':
      default:
        dateFilter = `shift_date = '${today}'`;
        break;
    }

    const result = await query(`
      SELECT *
      FROM production_records
      WHERE machine_id = $1 AND ${dateFilter}
      ORDER BY shift_date DESC, shift ASC
    `, [id]);

    // Also get 15-minute interval production data for charts
    const intervalResult = await query(`
      SELECT
        date_trunc('hour', created_at) +
          (EXTRACT(minute FROM created_at)::int / 15) * INTERVAL '15 minutes' AS interval_start,
        COUNT(*) FILTER (WHERE event_type = 'motion') as motion_events,
        COUNT(*) FILTER (WHERE event_type = 'production') as production_events,
        SUM(COALESCE(pieces_count, 0)) as pieces,
        AVG(intensity) as avg_intensity
      FROM machine_events
      WHERE machine_id = $1
        AND created_at::date = $2::date
      GROUP BY interval_start
      ORDER BY interval_start ASC
    `, [id, today]);

    return NextResponse.json({
      success: true,
      data: {
        records: result.rows,
        intervals: intervalResult.rows,
        period,
      }
    });
  } catch (error) {
    console.error('[MACHINES] Erro ao buscar produção:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dados de produção' },
      { status: 500 }
    );
  }
}
