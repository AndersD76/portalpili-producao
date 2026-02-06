import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';
import { verificarPermissao } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ numero: string; id: string }> }
) {
  // Verificar permissão de edição
  const auth = await verificarPermissao('PRODUCAO', 'editar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { numero, id } = await params;
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
      dias,
      formulario_anexo,
      responsavel_execucao,
      data_execucao,
      hora_execucao,
      foto_comprovacao
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

    if (dias !== undefined) {
      updates.push(`dias = $${paramCount}`);
      values.push(dias || null);
      paramCount++;
    }

    if (formulario_anexo !== undefined) {
      updates.push(`formulario_anexo = $${paramCount}`);
      values.push(formulario_anexo ? JSON.stringify(formulario_anexo) : null);
      paramCount++;
    }

    if (responsavel_execucao !== undefined) {
      updates.push(`responsavel_execucao = $${paramCount}`);
      values.push(responsavel_execucao);
      paramCount++;
    }

    if (data_execucao !== undefined) {
      updates.push(`data_execucao = $${paramCount}`);
      values.push(data_execucao || null);
      paramCount++;
    }

    if (hora_execucao !== undefined) {
      updates.push(`hora_execucao = $${paramCount}`);
      values.push(hora_execucao || null);
      paramCount++;
    }

    if (foto_comprovacao !== undefined) {
      updates.push(`foto_comprovacao = $${paramCount}`);
      values.push(foto_comprovacao || null);
      paramCount++;
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

    const atividadeAtualizada = result.rows[0];

    // Enviar notificação push se o status mudou para EM ANDAMENTO ou CONCLUÍDA
    if (status) {
      try {
        const usuario = responsavel_execucao || responsavel || 'Sistema';
        const nomeAtividade = atividadeAtualizada.atividade;

        if (status === 'EM ANDAMENTO') {
          await enviarNotificacaoPush(notificacoes.tarefaIniciada(numero, nomeAtividade, usuario));
        } else if (status === 'CONCLUÍDA') {
          await enviarNotificacaoPush(notificacoes.tarefaFinalizada(numero, nomeAtividade, usuario));
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
        // Não falha a atualização se falhar a notificação
      }
    }

    return NextResponse.json({
      success: true,
      data: atividadeAtualizada
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
