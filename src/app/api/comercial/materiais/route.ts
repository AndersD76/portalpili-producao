import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    let sql = `
      SELECT id, titulo, descricao, categoria, arquivo_nome, arquivo_url,
             arquivo_tamanho, arquivo_tipo, created_at
      FROM materiais_vendedor
      WHERE ativo = true
    `;
    const params: unknown[] = [];

    if (categoria) {
      sql += ` AND categoria = $1`;
      params.push(categoria);
    }

    sql += ` ORDER BY categoria, created_at DESC`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar materiais' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
