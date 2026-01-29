import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar setor específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(`
      SELECT
        s.*,
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
        ) FILTER (WHERE p.id IS NOT NULL) as perguntas
      FROM cq_setores s
      LEFT JOIN cq_perguntas p ON p.setor_id = s.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [parseInt(id)]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Setor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        perguntas: result.rows[0].perguntas || []
      }
    });
  } catch (error) {
    console.error('Erro ao buscar setor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar setor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar setor
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await request.json();
    const { codigo, nome, processo, produto, ordem, ativo } = body;

    const result = await client.query(`
      UPDATE cq_setores
      SET
        codigo = COALESCE($1, codigo),
        nome = COALESCE($2, nome),
        processo = COALESCE($3, processo),
        produto = COALESCE($4, produto),
        ordem = COALESCE($5, ordem),
        ativo = COALESCE($6, ativo),
        updated = NOW()
      WHERE id = $7
      RETURNING *
    `, [codigo, nome, processo, produto, ordem, ativo, parseInt(id)]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Setor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao atualizar setor:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Já existe um setor com este código' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar setor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - Excluir setor
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;

    const result = await client.query(
      'DELETE FROM cq_setores WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Setor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Setor excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir setor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir setor' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
