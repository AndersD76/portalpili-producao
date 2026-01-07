import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(`
      SELECT
        id,
        opd,
        numero,
        data_pedido,
        previsao_inicio,
        previsao_termino,
        data_prevista_entrega,
        inicio_producao,
        tipo_opd,
        responsavel_opd,
        atividades_opd,
        anexo_pedido,
        registros_atividade,
        mensagens,
        cliente,
        historico_data_entrega,
        created,
        updated
      FROM opds
      WHERE id = $1
    `, [parseInt(id)]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'OPD não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar OPD:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar OPD' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    // Campos que podem ser atualizados
    const allowedFields = [
      'numero',
      'data_pedido',
      'previsao_inicio',
      'previsao_termino',
      'data_prevista_entrega',
      'inicio_producao',
      'tipo_opd',
      'responsavel_opd',
      'atividades_opd',
      'anexo_pedido',
      'mensagens',
      'historico_data_entrega',
      'cliente'
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = $${paramCount}`);
        values.push(body[field] || null);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Adicionar updated timestamp
    updates.push('updated = CURRENT_TIMESTAMP');

    // Adicionar o ID no final
    values.push(parseInt(id));
    paramCount++;

    const query = `
      UPDATE opds
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'OPD não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'OPD atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar OPD:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar OPD' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar se a OPD existe e pegar o número
    const checkResult = await pool.query(
      'SELECT id, numero FROM opds WHERE id = $1',
      [parseInt(id)]
    );

    if (checkResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'OPD não encontrada' },
        { status: 404 }
      );
    }

    const numeroOpd = checkResult.rows[0].numero;

    // Deletar atividades relacionadas primeiro
    await pool.query('DELETE FROM registros_atividades WHERE numero_opd = $1', [numeroOpd]);

    // Deletar a OPD
    await pool.query('DELETE FROM opds WHERE id = $1', [parseInt(id)]);

    return NextResponse.json({
      success: true,
      message: 'OPD e atividades deletadas com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar OPD:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao deletar OPD' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
