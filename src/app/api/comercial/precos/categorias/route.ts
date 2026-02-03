import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const produto = searchParams.get('produto');
    const ativo = searchParams.get('ativo');

    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM crm_precos_opcoes o WHERE o.categoria_id = c.id AND o.ativo = true) as total_opcoes
      FROM crm_precos_categorias c
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (produto) {
      sql += ` AND (c.produto = $${paramIndex} OR c.produto = 'AMBOS')`;
      params.push(produto);
      paramIndex++;
    }

    if (ativo !== null) {
      sql += ` AND c.ativo = $${paramIndex++}`;
      params.push(ativo === 'true');
    }

    sql += ` ORDER BY c.ordem_exibicao, c.nome`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar categorias' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigo, nome, descricao, produto, icone, cor, ordem_exibicao } = body;

    if (!codigo || !nome) {
      return NextResponse.json(
        { success: false, error: 'Código e nome são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_precos_categorias (codigo, nome, descricao, produto, icone, cor, ordem_exibicao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [codigo, nome, descricao, produto, icone, cor, ordem_exibicao || 0]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Categoria criada com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar categoria' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
