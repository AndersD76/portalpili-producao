import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estagio = searchParams.get('estagio');
    const situacao = searchParams.get('situacao');
    const vendedor_id = searchParams.get('vendedor_id');
    const cliente_id = searchParams.get('cliente_id');
    const tipo_produto = searchParams.get('tipo_produto');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        o.*,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cnpj as cliente_cnpj,
        v.nome as vendedor_nome,
        COUNT(DISTINCT a.id) as total_atividades,
        COUNT(DISTINCT CASE WHEN a.concluida = false AND a.data_limite < NOW() THEN a.id END) as atividades_atrasadas,
        MAX(a.data_limite) as proxima_atividade
      FROM crm_oportunidades o
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON o.vendedor_id = v.id
      LEFT JOIN crm_atividades a ON o.id = a.oportunidade_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (estagio) {
      sql += ` AND o.estagio = $${paramIndex++}`;
      params.push(estagio);
    }

    if (situacao) {
      sql += ` AND o.situacao = $${paramIndex++}`;
      params.push(situacao);
    }

    if (vendedor_id) {
      sql += ` AND o.vendedor_id = $${paramIndex++}`;
      params.push(vendedor_id);
    }

    if (cliente_id) {
      sql += ` AND o.cliente_id = $${paramIndex++}`;
      params.push(cliente_id);
    }

    if (tipo_produto) {
      sql += ` AND o.tipo_produto = $${paramIndex++}`;
      params.push(tipo_produto);
    }

    if (search) {
      sql += ` AND (o.titulo ILIKE $${paramIndex} OR c.razao_social ILIKE $${paramIndex} OR c.nome_fantasia ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += `
      GROUP BY o.id, c.razao_social, c.nome_fantasia, c.cnpj, v.nome
      ORDER BY
        CASE o.estagio
          WHEN 'FECHAMENTO' THEN 1
          WHEN 'NEGOCIACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'QUALIFICACAO' THEN 4
          WHEN 'PROSPECCAO' THEN 5
        END,
        o.valor_estimado DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Conta totais para dashboard do pipeline
    const pipelineResult = await query(`
      SELECT
        estagio,
        COUNT(*) as quantidade,
        SUM(valor_estimado) as valor_total
      FROM crm_oportunidades
      WHERE situacao = 'ABERTA'
      GROUP BY estagio
    `);

    // Conta total para paginação
    let countSql = `SELECT COUNT(DISTINCT o.id) as total FROM crm_oportunidades o WHERE 1=1`;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (estagio) {
      countSql += ` AND o.estagio = $${countParamIndex++}`;
      countParams.push(estagio);
    }
    if (situacao) {
      countSql += ` AND o.situacao = $${countParamIndex++}`;
      countParams.push(situacao);
    }
    if (vendedor_id) {
      countSql += ` AND o.vendedor_id = $${countParamIndex++}`;
      countParams.push(vendedor_id);
    }
    if (cliente_id) {
      countSql += ` AND o.cliente_id = $${countParamIndex++}`;
      countParams.push(cliente_id);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult?.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      pipeline: pipelineResult?.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar oportunidades:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar oportunidades' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cliente_id,
      vendedor_id,
      titulo,
      descricao,
      tipo_produto,
      valor_estimado,
      probabilidade,
      data_previsao_fechamento,
      origem,
      concorrentes,
      observacoes,
    } = body;

    if (!cliente_id || !vendedor_id || !titulo) {
      return NextResponse.json(
        { success: false, error: 'Cliente, vendedor e título são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_oportunidades (
        cliente_id, vendedor_id, titulo, descricao, tipo_produto,
        valor_estimado, probabilidade, data_previsao_fechamento,
        origem, concorrentes, observacoes, estagio, situacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PROSPECCAO', 'ABERTA')
      RETURNING *`,
      [
        cliente_id,
        vendedor_id,
        titulo,
        descricao,
        tipo_produto || 'TOMBADOR',
        valor_estimado || 0,
        probabilidade || 10,
        data_previsao_fechamento,
        origem || 'PROSPECÇÃO ATIVA',
        concorrentes,
        observacoes,
      ]
    );

    // Cria atividade inicial de qualificação
    await query(
      `INSERT INTO crm_atividades (
        oportunidade_id, tipo, titulo, descricao, data_limite, responsavel_id
      ) VALUES ($1, 'LIGACAO', 'Contato inicial de qualificação', 'Realizar primeiro contato para entender necessidades', NOW() + INTERVAL '2 days', $2)`,
      [result?.rows[0]?.id, vendedor_id]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Oportunidade criada com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar oportunidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar oportunidade' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
