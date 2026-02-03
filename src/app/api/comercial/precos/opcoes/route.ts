import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const produto = searchParams.get('produto');
    const categoria_id = searchParams.get('categoria_id');
    const ativo = searchParams.get('ativo');

    let sql = `
      SELECT o.*, c.nome as categoria_nome, c.codigo as categoria_codigo
      FROM crm_precos_opcoes o
      LEFT JOIN crm_precos_categorias c ON o.categoria_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (produto) {
      sql += ` AND (o.produto = $${paramIndex} OR o.produto = 'AMBOS')`;
      params.push(produto);
      paramIndex++;
    }

    if (categoria_id) {
      sql += ` AND o.categoria_id = $${paramIndex++}`;
      params.push(categoria_id);
    }

    if (ativo !== null) {
      sql += ` AND o.ativo = $${paramIndex++}`;
      params.push(ativo === 'true');
    }

    sql += ` ORDER BY c.ordem_exibicao, o.ordem_exibicao, o.nome`;

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar opções:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar opções' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      categoria_id,
      codigo,
      nome,
      descricao,
      preco,
      preco_tipo,
      produto,
      tamanhos_aplicaveis,
      tipos_aplicaveis,
      obrigatorio,
      incluso_no_base,
      quantidade_minima,
      quantidade_maxima,
      quantidade_padrao,
      permite_quantidade,
      grupo_exclusivo,
      texto_proposta,
      ordem_exibicao,
    } = body;

    if (!codigo || !nome || preco === undefined) {
      return NextResponse.json(
        { success: false, error: 'Código, nome e preço são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_precos_opcoes (
        categoria_id, codigo, nome, descricao, preco, preco_tipo, produto,
        tamanhos_aplicaveis, tipos_aplicaveis, obrigatorio, incluso_no_base,
        quantidade_minima, quantidade_maxima, quantidade_padrao, permite_quantidade,
        grupo_exclusivo, texto_proposta, ordem_exibicao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        categoria_id,
        codigo,
        nome,
        descricao,
        preco,
        preco_tipo || 'FIXO',
        produto,
        tamanhos_aplicaveis,
        tipos_aplicaveis,
        obrigatorio || false,
        incluso_no_base || false,
        quantidade_minima || 0,
        quantidade_maxima,
        quantidade_padrao || 1,
        permite_quantidade !== false,
        grupo_exclusivo,
        texto_proposta,
        ordem_exibicao || 0,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Opção criada com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar opção:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar opção' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
