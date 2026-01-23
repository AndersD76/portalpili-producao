import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar não conformidade por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      'SELECT * FROM nao_conformidades WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Não conformidade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar não conformidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar não conformidade' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar não conformidade
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar se existe
    const existingResult = await client.query(
      'SELECT * FROM nao_conformidades WHERE id = $1',
      [parseInt(id)]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Não conformidade não encontrada' },
        { status: 404 }
      );
    }

    const existingNC = existingResult.rows[0];

    // Validar se pode fechar NC com gravidade ALTA sem AC vinculada
    if (body.status === 'FECHADA' && existingNC.gravidade === 'ALTA' && !existingNC.acao_corretiva_id) {
      return NextResponse.json(
        { success: false, error: 'Não é possível fechar uma NC com gravidade ALTA sem uma Ação Corretiva vinculada. Crie uma RAC antes de fechar esta NC.' },
        { status: 400 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'data_ocorrencia', 'local_ocorrencia', 'setor_responsavel',
      'tipo', 'origem', 'gravidade', 'descricao', 'evidencias',
      'produtos_afetados', 'quantidade_afetada', 'detectado_por', 'detectado_por_id',
      'disposicao', 'disposicao_descricao', 'acao_contencao', 'data_contencao',
      'responsavel_contencao', 'status', 'acao_corretiva_id', 'closed_by', 'closed_at'
    ];

    for (const field of updateableFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        if (field === 'evidencias') {
          values.push(body[field] ? JSON.stringify(body[field]) : null);
        } else {
          values.push(body[field]);
        }
        paramIndex++;
      }
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

    // Adicionar ID no final
    values.push(parseInt(id));

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE nao_conformidades SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar não conformidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar não conformidade' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - Excluir não conformidade
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM nao_conformidades WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Não conformidade não encontrada' },
        { status: 404 }
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Não conformidade excluída com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir não conformidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir não conformidade' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
