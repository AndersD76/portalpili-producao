import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estagio = searchParams.get('estagio');
    const status = searchParams.get('status');
    let vendedor_id = searchParams.get('vendedor_id');
    const usuario_id = searchParams.get('usuario_id');
    const cliente_id = searchParams.get('cliente_id');
    const produto = searchParams.get('produto') || searchParams.get('tipo_produto');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // IMPORTANTE: Buscar pipeline PRIMEIRO (sem filtros) para garantir dados no dashboard
    let pipelineData: { estagio: string; quantidade: string; valor_total: string }[] = [];
    try {
      const pipelineResult = await query(`
        SELECT
          estagio,
          COUNT(*) as quantidade,
          COALESCE(SUM(valor_estimado), 0) as valor_total
        FROM crm_oportunidades
        GROUP BY estagio
        ORDER BY
          CASE estagio
            WHEN 'PROSPECCAO' THEN 1
            WHEN 'QUALIFICACAO' THEN 2
            WHEN 'PROPOSTA' THEN 3
            WHEN 'EM_ANALISE' THEN 4
            WHEN 'EM_NEGOCIACAO' THEN 5
            WHEN 'FECHADA' THEN 6
            WHEN 'PERDIDA' THEN 7
            WHEN 'SUSPENSO' THEN 8
            WHEN 'SUBSTITUIDO' THEN 9
            WHEN 'TESTE' THEN 10
          END
      `);
      pipelineData = pipelineResult?.rows || [];
    } catch (pipelineError) {
      console.error('Erro ao buscar pipeline:', pipelineError);
    }

    // Se usuario_id foi passado, buscar o vendedor_id correspondente
    if (usuario_id && !vendedor_id) {
      const vendedorResult = await query(
        `SELECT id FROM crm_vendedores WHERE usuario_id = $1`,
        [usuario_id]
      );
      if (vendedorResult?.rows?.length) {
        vendedor_id = vendedorResult.rows[0].id;
      }
    }

    let sql = `
      SELECT
        o.*,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cpf_cnpj as cliente_cnpj,
        v.nome as vendedor_nome,
        COUNT(DISTINCT a.id) as total_atividades,
        COUNT(DISTINCT CASE WHEN a.status != 'CONCLUIDA' AND a.data_agendada < NOW() THEN a.id END) as atividades_atrasadas,
        MAX(a.data_agendada) as proxima_atividade
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

    if (status) {
      sql += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }

    if (vendedor_id) {
      sql += ` AND o.vendedor_id = $${paramIndex++}`;
      params.push(vendedor_id);
    }

    if (cliente_id) {
      sql += ` AND o.cliente_id = $${paramIndex++}`;
      params.push(cliente_id);
    }

    if (produto) {
      sql += ` AND o.produto = $${paramIndex++}`;
      params.push(produto);
    }

    if (search) {
      sql += ` AND (o.titulo ILIKE $${paramIndex} OR c.razao_social ILIKE $${paramIndex} OR c.nome_fantasia ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += `
      GROUP BY o.id, c.razao_social, c.nome_fantasia, c.cpf_cnpj, v.nome
      ORDER BY
        CASE o.estagio
          WHEN 'EM_NEGOCIACAO' THEN 1
          WHEN 'PROSPECCAO' THEN 2
          WHEN 'FECHADA' THEN 3
          WHEN 'PERDIDA' THEN 4
          WHEN 'TESTE' THEN 5
          WHEN 'SUBSTITUIDO' THEN 6
          WHEN 'SUSPENSO' THEN 7
          WHEN 'PROPOSTA' THEN 8
          WHEN 'EM_ANALISE' THEN 9
          WHEN 'QUALIFICACAO' THEN 10
          ELSE 99
        END,
        o.valor_estimado DESC NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Pipeline já foi buscado no início da função (pipelineData)
    // Debug logging
    console.log('Pipeline data:', JSON.stringify(pipelineData, null, 2));

    // Conta total para paginação
    let countSql = `SELECT COUNT(DISTINCT o.id) as total FROM crm_oportunidades o WHERE 1=1`;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (estagio) {
      countSql += ` AND o.estagio = $${countParamIndex++}`;
      countParams.push(estagio);
    }
    if (status) {
      countSql += ` AND o.status = $${countParamIndex++}`;
      countParams.push(status);
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
      pipeline: pipelineData,
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
        origem, concorrentes, observacoes, estagio, status
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
        oportunidade_id, tipo, titulo, descricao, data_agendada, vendedor_id, status
      ) VALUES ($1, 'LIGACAO', 'Contato inicial de qualificação', 'Realizar primeiro contato para entender necessidades', NOW() + INTERVAL '2 days', $2, 'PENDENTE')`,
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
