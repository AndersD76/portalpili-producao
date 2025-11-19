import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ numero: string; id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      atividade,
      responsavel,
      status,
      data_inicio,
      data_termino,
      data_pedido,
      previsao_inicio,
      observacoes,
      dias_programados,
      requer_formulario,
      tipo_formulario,
      formulario_anexo,
      iniciado_por_id,
      iniciado_por_nome,
      iniciado_por_id_funcionario,
      finalizado_por_id,
      finalizado_por_nome,
      finalizado_por_id_funcionario,
      justificativa_reversao
    } = body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (atividade !== undefined) {
      updates.push(`atividade = $${paramCount}`);
      values.push(atividade);
      paramCount++;
    }

    if (responsavel !== undefined) {
      updates.push(`responsavel = $${paramCount}`);
      values.push(responsavel);
      paramCount++;
    }

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (data_inicio !== undefined) {
      updates.push(`data_inicio = $${paramCount}`);
      values.push(data_inicio || null);
      paramCount++;
    }

    if (data_termino !== undefined) {
      updates.push(`data_termino = $${paramCount}`);
      values.push(data_termino || null);
      paramCount++;
    }

    if (data_pedido !== undefined) {
      updates.push(`data_pedido = $${paramCount}`);
      values.push(data_pedido || null);
      paramCount++;
    }

    if (previsao_inicio !== undefined) {
      updates.push(`previsao_inicio = $${paramCount}`);
      values.push(previsao_inicio || null);
      paramCount++;
    }

    if (observacoes !== undefined) {
      updates.push(`observacoes = $${paramCount}`);
      values.push(observacoes);
      paramCount++;
    }

    if (dias_programados !== undefined) {
      updates.push(`dias_programados = $${paramCount}`);
      values.push(dias_programados || null);
      paramCount++;
    }

    if (requer_formulario !== undefined) {
      updates.push(`requer_formulario = $${paramCount}`);
      values.push(requer_formulario);
      paramCount++;
    }

    if (tipo_formulario !== undefined) {
      updates.push(`tipo_formulario = $${paramCount}`);
      values.push(tipo_formulario || null);
      paramCount++;
    }

    if (formulario_anexo !== undefined) {
      updates.push(`formulario_anexo = $${paramCount}`);
      values.push(formulario_anexo ? JSON.stringify(formulario_anexo) : null);
      paramCount++;
    }

    if (iniciado_por_id !== undefined) {
      updates.push(`iniciado_por_id = $${paramCount}`);
      values.push(iniciado_por_id);
      paramCount++;
    }

    if (iniciado_por_nome !== undefined) {
      updates.push(`iniciado_por_nome = $${paramCount}`);
      values.push(iniciado_por_nome);
      paramCount++;
    }

    if (iniciado_por_id_funcionario !== undefined) {
      updates.push(`iniciado_por_id_funcionario = $${paramCount}`);
      values.push(iniciado_por_id_funcionario);
      paramCount++;
    }

    if (finalizado_por_id !== undefined) {
      updates.push(`finalizado_por_id = $${paramCount}`);
      values.push(finalizado_por_id);
      paramCount++;
    }

    if (finalizado_por_nome !== undefined) {
      updates.push(`finalizado_por_nome = $${paramCount}`);
      values.push(finalizado_por_nome);
      paramCount++;
    }

    if (finalizado_por_id_funcionario !== undefined) {
      updates.push(`finalizado_por_id_funcionario = $${paramCount}`);
      values.push(finalizado_por_id_funcionario);
      paramCount++;
    }

    if (justificativa_reversao !== undefined) {
      updates.push(`justificativa_reversao = $${paramCount}`);
      values.push(justificativa_reversao);
      paramCount++;
    }

    // Adicionar updated timestamp
    updates.push(`updated = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;

    // Adicionar o ID no final
    values.push(parseInt(id));

    const query = `
      UPDATE registros_atividades
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar atividade' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
