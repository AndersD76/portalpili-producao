import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';
import { calculateShiftKpis } from '@/lib/machines/kpi-service';

export const dynamic = 'force-dynamic';

// GET /api/machines/:id — Machine details + KPIs
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  try {
    const result = await query('SELECT * FROM machines WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    const machine = result.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const shift = machine.operator_shift || 'A';

    let kpis = null;
    try {
      kpis = await calculateShiftKpis(id, today, shift);
    } catch (e) {
      console.warn('[MACHINES] Erro ao calcular KPIs:', e);
    }

    return NextResponse.json({
      success: true,
      data: { ...machine, kpis }
    });
  } catch (error) {
    console.error('[MACHINES] Erro ao buscar máquina:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar máquina' },
      { status: 500 }
    );
  }
}

// PUT /api/machines/:id — Update machine
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'editar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  try {
    const body = await request.json();
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowedFields = [
      'name', 'machine_code', 'location', 'cam_ip', 'cam_port',
      'operator_name', 'operator_shift', 'shift_start', 'shift_end',
      'daily_target', 'status'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = $${idx}`);
        values.push(body[field]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE machines SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[MACHINES] Erro ao atualizar máquina:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar máquina' },
      { status: 500 }
    );
  }
}
