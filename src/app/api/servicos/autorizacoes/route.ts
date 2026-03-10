import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * GET /api/servicos/autorizacoes
 * Lista autorizações (admin)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM expense_authorizations ${where} ORDER BY created_at DESC`,
      params
    );

    return NextResponse.json({ success: true, data: result?.rows || [] });
  } catch (error) {
    console.error('Erro ao listar autorizações:', error);
    return NextResponse.json({ success: false, error: 'Erro ao listar' }, { status: 500 });
  }
}

/**
 * POST /api/servicos/autorizacoes
 * Criar solicitação (público - técnico solicita)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requester_name, requester_phone, requester_email, reason, amount, manager_name } = body;

    if (!requester_name || !reason || !amount || !manager_name) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: nome, motivo, valor, gerente' },
        { status: 400 }
      );
    }

    const code = generateCode();

    const result = await query(
      `INSERT INTO expense_authorizations
       (code, requester_name, requester_phone, requester_email, reason, amount, manager_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, code`,
      [code, requester_name, requester_phone || null, requester_email || null, reason, parseFloat(amount), manager_name]
    );

    const row = result?.rows[0];

    return NextResponse.json({
      success: true,
      data: { id: row.id, code: row.code },
      message: 'Solicitação criada',
    });
  } catch (error) {
    console.error('Erro ao criar autorização:', error);
    return NextResponse.json({ success: false, error: 'Erro ao criar solicitação' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
