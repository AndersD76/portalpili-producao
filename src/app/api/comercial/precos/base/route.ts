import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const produto = searchParams.get('produto');
    const ativo = searchParams.get('ativo');

    let sql = `
      SELECT * FROM crm_precos_base
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (produto) {
      sql += ` AND produto = $${paramIndex++}`;
      params.push(produto);
    }

    if (ativo !== null) {
      sql += ` AND ativo = $${paramIndex++}`;
      params.push(ativo === 'true');
    }

    sql += ` ORDER BY produto, ordem_exibicao, tamanho`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar preços base:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar preços base' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      produto,
      tamanho,
      tipo,
      preco,
      descricao,
      capacidade,
      modelo,
      qt_cilindros,
      qt_motores,
      qt_oleo,
      qt_trava_chassi,
      angulo_inclinacao,
      aplicacao,
      ordem_exibicao,
    } = body;

    if (!produto || !tamanho || !preco) {
      return NextResponse.json(
        { success: false, error: 'Produto, tamanho e preço são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_precos_base (
        produto, tamanho, tipo, preco, descricao, capacidade, modelo,
        qt_cilindros, qt_motores, qt_oleo, qt_trava_chassi,
        angulo_inclinacao, aplicacao, ordem_exibicao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        produto,
        tamanho,
        tipo,
        preco,
        descricao,
        capacidade,
        modelo,
        qt_cilindros,
        qt_motores,
        qt_oleo,
        qt_trava_chassi,
        angulo_inclinacao,
        aplicacao,
        ordem_exibicao || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Preço base criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar preço base:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar preço base' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
