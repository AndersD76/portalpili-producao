import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/machines — List all machines with current status
export async function GET() {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(`
      SELECT
        m.*,
        pr.pieces_produced,
        pr.pieces_target as pr_target,
        pr.efficiency_pct,
        pr.oee_pct,
        pr.avg_cycle_time,
        pr.total_motion_events,
        pr.total_idle_events
      FROM machines m
      LEFT JOIN production_records pr
        ON pr.machine_id = m.id
        AND pr.shift_date = $1
        AND pr.shift = m.operator_shift
      ORDER BY m.machine_code ASC
    `, [today]);

    const machines = result.rows.map(row => ({
      ...row,
      kpis: row.pieces_produced != null ? {
        pieces_produced: row.pieces_produced || 0,
        pieces_target: row.pr_target || row.daily_target,
        atingimento_pct: row.pr_target > 0
          ? Math.round((row.pieces_produced / row.pr_target) * 1000) / 10
          : 0,
        efficiency_pct: row.efficiency_pct || 0,
        oee_pct: row.oee_pct || 0,
        avg_cycle_time_seconds: row.avg_cycle_time,
        pieces_per_hour: 0,
        total_motion_events: row.total_motion_events || 0,
        idle_events: row.total_idle_events || 0,
      } : null,
    }));

    return NextResponse.json({ success: true, data: machines });
  } catch (error: unknown) {
    console.error('[MACHINES] Erro ao listar máquinas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar máquinas' },
      { status: 500 }
    );
  }
}

// POST /api/machines — Create new machine
export async function POST(request: Request) {
  const auth = await verificarPermissao('PRODUCAO', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const {
      name, machine_code, location, cam_ip, cam_port,
      operator_name, operator_shift, shift_start, shift_end, daily_target
    } = body;

    if (!name || !machine_code) {
      return NextResponse.json(
        { success: false, error: 'Nome e código da máquina são obrigatórios' },
        { status: 400 }
      );
    }

    const apiKey = crypto.randomBytes(32).toString('hex');

    const result = await query(`
      INSERT INTO machines (name, machine_code, location, cam_ip, cam_port, api_key,
        operator_name, operator_shift, shift_start, shift_end, daily_target)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name, machine_code, location || null, cam_ip || null, cam_port || 80,
      apiKey, operator_name || null, operator_shift || null,
      shift_start || '07:00', shift_end || '15:20', daily_target || 400
    ]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    const pgError = error as { code?: string };
    if (pgError.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Código de máquina já existe' },
        { status: 409 }
      );
    }
    console.error('[MACHINES] Erro ao criar máquina:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar máquina' },
      { status: 500 }
    );
  }
}
