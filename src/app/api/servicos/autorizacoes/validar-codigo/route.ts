import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/servicos/autorizacoes/validar-codigo?code=XXXXXXXX
 * Valida código de autorização em tempo real
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code || code.length !== 8) {
    return NextResponse.json({ valido: false, error: 'Código inválido' });
  }

  try {
    const result = await query(
      `SELECT ea.*,
        (SELECT COUNT(*) FROM field_expenses WHERE auth_code = ea.code) as usage_count
       FROM expense_authorizations ea
       WHERE ea.code = $1`,
      [code]
    );

    if (!result?.rows?.length) {
      return NextResponse.json({ valido: false, error: 'Código não encontrado' });
    }

    const auth = result.rows[0];

    if (auth.status !== 'Aprovada') {
      return NextResponse.json({ valido: false, error: `Autorização ${auth.status.toLowerCase()}` });
    }

    if (Number(auth.usage_count) > 0) {
      return NextResponse.json({ valido: false, error: 'Código já utilizado' });
    }

    return NextResponse.json({
      valido: true,
      manager_name: auth.manager_name,
      amount: auth.amount,
      reason: auth.reason,
    });
  } catch (error) {
    console.error('Erro ao validar código:', error);
    return NextResponse.json({ valido: false, error: 'Erro ao validar' });
  }
}

export const dynamic = 'force-dynamic';
