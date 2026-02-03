import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidade_id = searchParams.get('oportunidade_id');
    const responsavel_id = searchParams.get('responsavel_id');
    const tipo = searchParams.get('tipo');
    const concluida = searchParams.get('concluida');
    const atrasadas = searchParams.get('atrasadas');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        a.*,
        o.titulo as oportunidade_titulo,
        o.estagio as oportunidade_estagio,
        c.razao_social as cliente_nome,
        v.nome as responsavel_nome
      FROM crm_atividades a
      LEFT JOIN crm_oportunidades o ON a.oportunidade_id = o.id
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON a.responsavel_id = v.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (oportunidade_id) {
      sql += ` AND a.oportunidade_id = $${paramIndex++}`;
      params.push(oportunidade_id);
    }

    if (responsavel_id) {
      sql += ` AND a.responsavel_id = $${paramIndex++}`;
      params.push(responsavel_id);
    }

    if (tipo) {
      sql += ` AND a.tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    if (concluida !== null) {
      sql += ` AND a.concluida = $${paramIndex++}`;
      params.push(concluida === 'true');
    }

    if (atrasadas === 'true') {
      sql += ` AND a.concluida = false AND a.data_limite < NOW()`;
    }

    sql += `
      ORDER BY
        a.concluida ASC,
        a.data_limite ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Conta totais por status
    const totaisResult = await query(`
      SELECT
        COUNT(*) FILTER (WHERE concluida = false) as pendentes,
        COUNT(*) FILTER (WHERE concluida = true) as concluidas,
        COUNT(*) FILTER (WHERE concluida = false AND data_limite < NOW()) as atrasadas,
        COUNT(*) FILTER (WHERE concluida = false AND data_limite BETWEEN NOW() AND NOW() + INTERVAL '7 days') as proxima_semana
      FROM crm_atividades
      ${responsavel_id ? `WHERE responsavel_id = ${responsavel_id}` : ''}
    `);

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
  try {
    const body = await request.json();
    const {
      oportunidade_id,
      tipo,
      titulo,
      descricao,
      data_limite,
      responsavel_id,
      lembrete,
      lembrete_minutos,
    } = body;

    if (!oportunidade_id || !titulo || !tipo) {
      return NextResponse.json(
        { success: false, error: 'Oportunidade, título e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_atividades (
        oportunidade_id, tipo, titulo, descricao, data_limite,
        responsavel_id, lembrete, lembrete_minutos
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        oportunidade_id,
        tipo,
        titulo,
        descricao,
        data_limite,
        responsavel_id,
        lembrete || false,
        lembrete_minutos || 30,
      ]
    );

    // Registra interação
    await query(
      `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
       VALUES ($1, 'ANOTACAO', $2)`,
      [oportunidade_id, `Atividade criada: ${titulo}`]
    );

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
