import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

export async function GET() {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const result = await query(
      `SELECT id, nome, email, telefone, whatsapp
       FROM crm_vendedores
       WHERE usuario_id = $1 AND ativo = true
       LIMIT 1`,
      [auth.usuario.id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar vendedor logado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar vendedor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
