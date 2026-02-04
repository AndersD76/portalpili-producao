import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '100';

    // Buscar usuário
    const result = await pool.query(`
      SELECT
        id,
        nome,
        id_funcionario,
        ativo,
        CASE WHEN senha_hash IS NOT NULL THEN 'SIM' ELSE 'NAO' END as tem_senha,
        LEFT(senha_hash, 30) as hash_preview
      FROM usuarios
      WHERE id_funcionario = $1
    `, [id]);

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: `Usuário com id_funcionario = '${id}' não encontrado`,
        db_host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
      });
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        id_funcionario: user.id_funcionario,
        ativo: user.ativo,
        tem_senha: user.tem_senha,
        hash_preview: user.hash_preview + '...'
      },
      db_host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      db_host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
