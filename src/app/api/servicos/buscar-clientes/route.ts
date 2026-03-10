import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';

/**
 * GET /api/servicos/buscar-clientes?search=termo&limit=8
 * Busca clientes para o módulo Serviços (não exige permissão COMERCIAL)
 */
export async function GET(request: Request) {
  const auth = await verificarPermissao('SERVICOS', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '8');

    if (search.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const result = await query(
      `SELECT id, razao_social, nome_fantasia, municipio, estado
       FROM crm_clientes
       WHERE razao_social ILIKE $1 OR nome_fantasia ILIKE $1
       ORDER BY nome_fantasia, razao_social
       LIMIT $2`,
      [`%${search}%`, limit]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
    });
  } catch (error) {
    console.error('Erro ao buscar clientes (serviços):', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
