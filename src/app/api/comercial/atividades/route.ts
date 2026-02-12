import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const oportunidade_id = searchParams.get('oportunidade_id');
    const vendedor_id = searchParams.get('vendedor_id') || searchParams.get('responsavel_id');
    const tipo = searchParams.get('tipo');
    const status = searchParams.get('status');
    const concluida = searchParams.get('concluida');
    const atrasadas = searchParams.get('atrasadas');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        a.*,
        a.vendedor_id as responsavel_id,
        a.data_agendada as data_limite,
        CASE WHEN a.status = 'CONCLUIDA' THEN true ELSE false END as concluida,
        o.titulo as oportunidade_titulo,
        o.estagio as oportunidade_estagio,
        c.razao_social as cliente_nome,
        v.nome as responsavel_nome,
        v.nome as vendedor_nome
      FROM crm_atividades a
      LEFT JOIN crm_oportunidades o ON a.oportunidade_id = o.id
      LEFT JOIN crm_clientes c ON COALESCE(a.cliente_id, o.cliente_id) = c.id
      LEFT JOIN crm_vendedores v ON a.vendedor_id = v.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (oportunidade_id) {
      sql += ` AND a.oportunidade_id = $${paramIndex++}`;
      params.push(oportunidade_id);
    }

    if (vendedor_id) {
      sql += ` AND a.vendedor_id = $${paramIndex++}`;
      params.push(vendedor_id);
    }

    if (tipo) {
      sql += ` AND a.tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    if (status) {
      sql += ` AND a.status = $${paramIndex++}`;
      params.push(status);
    }

    if (concluida !== null && concluida !== undefined) {
      if (concluida === 'true') {
        sql += ` AND a.status = 'CONCLUIDA'`;
      } else if (concluida === 'false') {
        sql += ` AND a.status != 'CONCLUIDA'`;
      }
    }

    if (atrasadas === 'true') {
      sql += ` AND a.status != 'CONCLUIDA' AND a.data_agendada < NOW()`;
    }

    sql += `
      ORDER BY
        CASE WHEN a.status = 'CONCLUIDA' THEN 1 ELSE 0 END ASC,
        a.data_agendada ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Conta totais por status (com parametrização segura)
    const totaisParams: unknown[] = [];
    let totaisSql = `
      SELECT
        COUNT(*) FILTER (WHERE status != 'CONCLUIDA') as pendentes,
        COUNT(*) FILTER (WHERE status = 'CONCLUIDA') as concluidas,
        COUNT(*) FILTER (WHERE status != 'CONCLUIDA' AND data_agendada < NOW()) as atrasadas,
        COUNT(*) FILTER (WHERE status != 'CONCLUIDA' AND data_agendada BETWEEN NOW() AND NOW() + INTERVAL '7 days') as proxima_semana
      FROM crm_atividades
    `;
    if (vendedor_id) {
      totaisSql += ` WHERE vendedor_id = $1`;
      totaisParams.push(vendedor_id);
    }
    const totaisResult = await query(totaisSql, totaisParams);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      totais: totaisResult?.rows[0] || {},
      pagination: {
        page,
        limit,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar atividades' },
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
      oportunidade_id,
      cliente_id,
      tipo,
      titulo,
      descricao,
      data_agendada,
      data_limite,
      vendedor_id,
      responsavel_id,
      status = 'PENDENTE',
    } = body;

    const dataAtividade = data_agendada || data_limite;
    const idVendedor = vendedor_id || responsavel_id;

    if (!titulo || !tipo) {
      return NextResponse.json(
        { success: false, error: 'Título e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_atividades (
        oportunidade_id, cliente_id, tipo, titulo, descricao, data_agendada,
        vendedor_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *, vendedor_id as responsavel_id, data_agendada as data_limite`,
      [
        oportunidade_id || null,
        cliente_id || null,
        tipo,
        titulo,
        descricao,
        dataAtividade,
        idVendedor,
        status,
      ]
    );

    // Registra interação se há oportunidade
    if (oportunidade_id) {
      await query(
        `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
         VALUES ($1, 'ANOTACAO', $2)`,
        [oportunidade_id, `Atividade criada: ${titulo}`]
      ).catch(() => {}); // Ignora erros se a tabela não existir
    }

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Atividade criada com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar atividade' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
