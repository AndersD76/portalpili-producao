import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ativo = searchParams.get('ativo');

    let sql = `SELECT * FROM crm_precos_descontos WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (ativo !== null) {
      sql += ` AND ativo = $${paramIndex++}`;
      params.push(ativo === 'true');
    }

    sql += ` ORDER BY ordem_exibicao, desconto_percentual`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar descontos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar descontos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      nome,
      descricao,
      desconto_percentual,
      fator_multiplicador,
      comissao_percentual,
      desconto_maximo_vendedor,
      requer_aprovacao_gerente,
      requer_aprovacao_diretor,
      ordem_exibicao,
    } = body;

    if (desconto_percentual === undefined || fator_multiplicador === undefined || comissao_percentual === undefined) {
      return NextResponse.json(
        { success: false, error: 'Desconto, fator multiplicador e comissão são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_precos_descontos (
        nome, descricao, desconto_percentual, fator_multiplicador, comissao_percentual,
        desconto_maximo_vendedor, requer_aprovacao_gerente, requer_aprovacao_diretor, ordem_exibicao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        nome,
        descricao,
        desconto_percentual,
        fator_multiplicador,
        comissao_percentual,
        desconto_maximo_vendedor !== false,
        requer_aprovacao_gerente || false,
        requer_aprovacao_diretor || false,
        ordem_exibicao || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Desconto criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar desconto:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar desconto' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
