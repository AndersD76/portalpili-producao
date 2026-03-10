import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * PATCH /api/servicos/despesas/[id]
 * Editar despesa (validação admin ou correção)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('SERVICOS', 'editar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  try {
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowedFields = [
      'technician_name', 'client_name', 'location', 'category',
      'expense_date', 'vehicle_id', 'vehicle_km', 'fuel_liters', 'fuel_type',
      'service_type', 'service_type_custom', 'auth_code', 'item_description',
      'amount', 'payment_method', 'osv_number', 'nf_number', 'notes',
      'status', 'validated_by',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(body[field] === '' ? null : body[field]);
      }
    }

    // Handle status changes
    if (body.status === 'validado' || body.status === 'rejeitado') {
      updates.push(`validated_at = NOW()`);
      if (auth.usuario?.nome && !body.validated_by) {
        updates.push(`validated_by = $${idx++}`);
        values.push(auth.usuario.nome);
      }
    }

    // Normalize
    if (body.client_name !== undefined) {
      updates.push(`client_name_normalized = $${idx++}`);
      values.push(body.client_name?.toUpperCase().trim() || null);
    }
    if (body.location !== undefined) {
      updates.push(`location_normalized = $${idx++}`);
      values.push(body.location?.toUpperCase().trim() || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await query(
      `UPDATE field_expenses SET ${updates.join(', ')} WHERE id = $${idx}`,
      values
    );

    return NextResponse.json({ success: true, message: 'Despesa atualizada' });
  } catch (error) {
    console.error('Erro ao atualizar despesa:', error);
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 });
  }
}

/**
 * DELETE /api/servicos/despesas/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('SERVICOS', 'excluir');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  try {
    await query('DELETE FROM field_expenses WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Despesa excluída' });
  } catch (error) {
    console.error('Erro ao excluir despesa:', error);
    return NextResponse.json({ success: false, error: 'Erro ao excluir' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
