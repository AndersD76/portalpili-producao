import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await query('DELETE FROM materiais_vendedor WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir material:', error);
    return NextResponse.json({ success: false, error: 'Erro ao excluir' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { titulo, descricao, categoria, ativo } = body;

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (titulo !== undefined) { sets.push(`titulo = $${idx++}`); vals.push(titulo); }
    if (descricao !== undefined) { sets.push(`descricao = $${idx++}`); vals.push(descricao); }
    if (categoria !== undefined) { sets.push(`categoria = $${idx++}`); vals.push(categoria); }
    if (ativo !== undefined) { sets.push(`ativo = $${idx++}`); vals.push(ativo); }
    sets.push('updated_at = NOW()');
    vals.push(id);

    const result = await query(
      `UPDATE materiais_vendedor SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ success: true, data: result?.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    return NextResponse.json({ success: false, error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
