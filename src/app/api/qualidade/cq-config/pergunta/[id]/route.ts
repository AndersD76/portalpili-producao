import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar pergunta específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      'SELECT * FROM cq_perguntas WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pergunta não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar pergunta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar pergunta' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar pergunta
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await request.json();

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'codigo', 'descricao', 'etapa', 'avaliacao', 'medida_critica',
      'metodo_verificacao', 'instrumento', 'criterios_aceitacao',
      'requer_imagem', 'imagem_descricao', 'tipo_resposta', 'ordem', 'ativo'
    ];

    for (const field of updateableFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    // Tratar opcoes separadamente (precisa ser JSON)
    if (body.opcoes !== undefined) {
      fields.push(`opcoes = $${paramIndex}`);
      values.push(JSON.stringify(body.opcoes));
      paramIndex++;
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Adicionar updated
    fields.push(`updated = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    // Adicionar ID
    values.push(parseInt(id));

    const result = await client.query(
      `UPDATE cq_perguntas SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pergunta não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Erro ao atualizar pergunta:', error);
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Já existe uma pergunta com este código neste setor' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar pergunta' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - Excluir pergunta
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();
  try {
    const { id } = await params;

    const result = await client.query(
      'DELETE FROM cq_perguntas WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pergunta não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pergunta excluída com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir pergunta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir pergunta' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
