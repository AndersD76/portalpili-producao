import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Listar todos os setores com suas perguntas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause = includeInactive ? '' : 'WHERE s.ativo = true';

    const result = await pool.query(`
      SELECT
        s.id as setor_id,
        s.codigo as setor_codigo,
        s.nome as setor_nome,
        s.processo,
        s.produto,
        s.ordem as setor_ordem,
        s.ativo as setor_ativo,
        json_agg(
          json_build_object(
            'id', p.id,
            'codigo', p.codigo,
            'descricao', p.descricao,
            'etapa', p.etapa,
            'avaliacao', p.avaliacao,
            'medidaCritica', p.medida_critica,
            'metodoVerificacao', p.metodo_verificacao,
            'instrumento', p.instrumento,
            'criteriosAceitacao', p.criterios_aceitacao,
            'opcoes', p.opcoes,
            'requerImagem', p.requer_imagem,
            'imagemDescricao', p.imagem_descricao,
            'tipoResposta', p.tipo_resposta,
            'ordem', p.ordem,
            'ativo', p.ativo
          ) ORDER BY p.ordem, p.id
        ) FILTER (WHERE p.id IS NOT NULL ${includeInactive ? '' : 'AND p.ativo = true'}) as perguntas
      FROM cq_setores s
      LEFT JOIN cq_perguntas p ON p.setor_id = s.id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.ordem, s.id
    `);

    // Formatar resultado
    const setores = result.rows.map(row => ({
      id: row.setor_id,
      codigo: row.setor_codigo,
      nome: row.setor_nome,
      processo: row.processo,
      produto: row.produto,
      ordem: row.setor_ordem,
      ativo: row.setor_ativo,
      perguntas: row.perguntas || []
    }));

    return NextResponse.json({
      success: true,
      data: setores
    });
  } catch (error) {
    console.error('Erro ao buscar configurações CQ:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configurações' },
      { status: 500 }
    );
  }
}

// POST - Criar novo setor
export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { codigo, nome, processo, produto, ordem } = body;

    if (!codigo || !nome) {
      return NextResponse.json(
        { success: false, error: 'Código e nome são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await client.query(`
      INSERT INTO cq_setores (codigo, nome, processo, produto, ordem)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [codigo, nome, processo || null, produto || 'TOMBADOR', ordem || 0]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao criar setor CQ:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Já existe um setor com este código' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Erro ao criar setor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
