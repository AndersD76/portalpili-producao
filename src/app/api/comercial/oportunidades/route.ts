import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';
import { calcularProbabilidadeSmart } from '@/lib/comercial/probabilidade';

export async function GET(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const estagio = searchParams.get('estagio');
    const status = searchParams.get('status');
    let vendedor_id = searchParams.get('vendedor_id');
    const cliente_id = searchParams.get('cliente_id');
    const produto = searchParams.get('produto') || searchParams.get('tipo_produto');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // SERVER-SIDE: Se NÃO é admin, forçar filtro pelo vendedor do usuário logado
    const isAdmin = auth.usuario.is_admin;
    let vendedorNaoEncontrado = false;
    if (!isAdmin && !vendedor_id) {
      // Tentar encontrar vendedor pelo usuario_id
      const vendedorResult = await query(
        `SELECT id FROM crm_vendedores WHERE usuario_id = $1`,
        [auth.usuario.id]
      );
      if (vendedorResult?.rows?.length) {
        vendedor_id = String(vendedorResult.rows[0].id);
      } else {
        // Fallback: buscar por nome similar
        const vendedorByName = await query(
          `SELECT id FROM crm_vendedores WHERE LOWER(nome) = LOWER($1) OR nome ILIKE $2 LIMIT 1`,
          [auth.usuario.nome, `%${auth.usuario.nome.split(' ')[0]}%`]
        );
        if (vendedorByName?.rows?.length) {
          vendedor_id = String(vendedorByName.rows[0].id);
        } else {
          console.warn(`[OPORTUNIDADES] Vendedor não encontrado para usuário ${auth.usuario.id} (${auth.usuario.nome})`);
          vendedorNaoEncontrado = true;
        }
      }
    }

    // Se não é admin e não tem vendedor vinculado, retorna lista vazia
    if (vendedorNaoEncontrado) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        aviso: 'Seu usuário não está vinculado a um vendedor. Contate o administrador.',
      });
    }

    // Buscar pipeline filtrado pelo vendedor (se aplicável)
    let pipelineData: { estagio: string; quantidade: string; valor_total: string }[] = [];
    try {
      let pipelineSql = `
        SELECT
          estagio,
          COUNT(*) as quantidade,
          COALESCE(SUM(valor_estimado), 0) as valor_total
        FROM crm_oportunidades
      `;
      const pipelineParams: unknown[] = [];

      if (vendedor_id) {
        pipelineSql += ` WHERE vendedor_id = $1`;
        pipelineParams.push(vendedor_id);
      }

      pipelineSql += `
        GROUP BY estagio
        ORDER BY
          CASE estagio
            WHEN 'EM_ANALISE' THEN 1
            WHEN 'EM_NEGOCIACAO' THEN 2
            WHEN 'POS_NEGOCIACAO' THEN 3
            WHEN 'FECHADA' THEN 4
            WHEN 'PERDIDA' THEN 5
            WHEN 'TESTE' THEN 6
            WHEN 'SUSPENSO' THEN 7
            WHEN 'SUBSTITUIDO' THEN 8
            ELSE 99
          END
      `;
      const pipelineResult = await query(pipelineSql, pipelineParams);
      pipelineData = pipelineResult?.rows || [];
    } catch (pipelineError) {
      console.error('Erro ao buscar pipeline:', pipelineError);
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
        MAX(a.data_agendada) as proxima_atividade,
        (SELECT i.created_at FROM crm_interacoes i WHERE i.oportunidade_id = o.id ORDER BY i.created_at DESC LIMIT 1) as ultimo_contato,
        (SELECT i.descricao FROM crm_interacoes i WHERE i.oportunidade_id = o.id ORDER BY i.created_at DESC LIMIT 1) as ultimo_contato_desc
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
          WHEN 'EM_ANALISE' THEN 1
          WHEN 'EM_NEGOCIACAO' THEN 2
          WHEN 'POS_NEGOCIACAO' THEN 3
          WHEN 'FECHADA' THEN 4
          WHEN 'PERDIDA' THEN 5
          WHEN 'TESTE' THEN 6
          WHEN 'SUSPENSO' THEN 7
          WHEN 'SUBSTITUIDO' THEN 8
          ELSE 99
        END,
        o.valor_estimado DESC NULLS LAST
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Buscar win rate por vendedor para cálculo de probabilidade inteligente
    const vendedorStatsResult = await query(`
      SELECT
        vendedor_id,
        COUNT(*) FILTER (WHERE estagio IN ('FECHADA', 'PERDIDA')) as total_deals,
        COUNT(*) FILTER (WHERE estagio = 'FECHADA') as ganhas
      FROM crm_oportunidades
      GROUP BY vendedor_id
    `);
    const vendedorStats: Record<number, { win_rate: number; total_deals: number }> = {};
    for (const row of vendedorStatsResult?.rows || []) {
      const total = parseInt(row.total_deals) || 0;
      const ganhas = parseInt(row.ganhas) || 0;
      vendedorStats[row.vendedor_id] = {
        total_deals: total,
        win_rate: total > 0 ? (ganhas / total) * 100 : 0,
      };
    }

    // Calcular probabilidade_smart para cada oportunidade
    const rows = (result?.rows || []).map((op: Record<string, unknown>) => {
      const stats = vendedorStats[op.vendedor_id as number] || { win_rate: 0, total_deals: 0 };
      const { score } = calcularProbabilidadeSmart({
        estagio: String(op.estagio || ''),
        status: String(op.status || ''),
        dias_no_estagio: Number(op.dias_no_estagio) || 0,
        valor_estimado: parseFloat(String(op.valor_estimado)) || 0,
        produto: String(op.produto || ''),
        concorrente: String(op.concorrente || ''),
        temperatura: String(op.temperatura || ''),
        total_atividades: Number(op.total_atividades) || 0,
        atividades_atrasadas: Number(op.atividades_atrasadas) || 0,
        ultimo_contato: op.ultimo_contato as string | null,
        vendedor_win_rate: stats.win_rate,
        vendedor_total_deals: stats.total_deals,
      });
      return { ...op, probabilidade_smart: score };
    });

    // Conta total para paginação (com mesmos filtros)
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
      data: rows,
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
  const auth = await verificarPermissao('COMERCIAL', 'criar');
  if (!auth.permitido) return auth.resposta;

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
        cliente_id, vendedor_id, titulo, descricao, produto,
        valor_estimado, probabilidade, data_previsao_fechamento,
        fonte, concorrente, observacoes, estagio, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'EM_ANALISE', 'ABERTA')
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
