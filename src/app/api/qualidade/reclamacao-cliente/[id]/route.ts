import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar reclamação por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      'SELECT * FROM reclamacoes_clientes WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reclamação não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar reclamação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar reclamação' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar reclamação
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
      'SELECT * FROM reclamacoes_clientes WHERE id = $1',
      [parseInt(id)]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Reclamação não encontrada' },
        { status: 404 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'data_reclamacao', 'cliente_nome', 'cliente_contato', 'cliente_email',
      'cliente_telefone', 'numero_opd', 'numero_serie', 'tipo_reclamacao',
      'descricao', 'evidencias', 'impacto', 'procedencia', 'justificativa_procedencia',
      'resposta_cliente', 'data_resposta', 'responsavel_resposta', 'acao_tomada',
      'data_resolucao', 'cliente_satisfeito', 'nao_conformidade_id', 'acao_corretiva_id', 'status'
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
      `UPDATE reclamacoes_clientes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar reclamação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar reclamação' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - Excluir reclamação
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM reclamacoes_clientes WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Reclamação não encontrada' },
        { status: 404 }
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Reclamação excluída com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir reclamação:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir reclamação' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
