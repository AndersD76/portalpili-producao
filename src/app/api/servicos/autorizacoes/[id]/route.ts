import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/servicos/autorizacoes/[id]
 * Busca uma autorização (público - para página de decisão)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await query(
      'SELECT * FROM expense_authorizations WHERE id = $1',
      [id]
    );

    if (!result?.rows?.length) {
      return NextResponse.json({ success: false, error: 'Solicitação não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar autorização:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar' }, { status: 500 });
  }
}

/**
 * PATCH /api/servicos/autorizacoes/[id]
 * Aprovar ou reprovar (público - gerente decide via link WhatsApp)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    if (!['Aprovada', 'Reprovada'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Status inválido' }, { status: 400 });
    }

    // Check current status
    const current = await query('SELECT * FROM expense_authorizations WHERE id = $1', [id]);
    if (!current?.rows?.length) {
      return NextResponse.json({ success: false, error: 'Não encontrada' }, { status: 404 });
    }

    if (current.rows[0].status !== 'Pendente') {
      return NextResponse.json({
        success: false,
        error: `Já foi ${current.rows[0].status.toLowerCase()}`,
        data: current.rows[0],
      }, { status: 409 });
    }

    await query(
      `UPDATE expense_authorizations SET status = $1, decision_at = NOW() WHERE id = $2`,
      [status, id]
    );

    // Return updated record
    const updated = await query('SELECT * FROM expense_authorizations WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      data: updated?.rows[0],
      message: status === 'Aprovada' ? 'Autorização aprovada' : 'Autorização reprovada',
    });
  } catch (error) {
    console.error('Erro ao atualizar autorização:', error);
    return NextResponse.json({ success: false, error: 'Erro ao processar' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
