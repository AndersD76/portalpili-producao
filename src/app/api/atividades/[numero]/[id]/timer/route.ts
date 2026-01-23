import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';

type AcaoTimer = 'INICIAR' | 'PAUSAR' | 'RETOMAR' | 'FINALIZAR';

interface LogAtividade {
  timestamp: string;
  usuario_nome: string;
  usuario_id?: number;
  acao: 'INICIOU' | 'PAUSOU' | 'RETOMOU' | 'FINALIZOU';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ numero: string; id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { acao, usuario_nome, usuario_id } = body as {
      acao: AcaoTimer;
      usuario_nome: string;
      usuario_id?: number;
    };

    if (!acao || !usuario_nome) {
      return NextResponse.json(
        { success: false, error: 'Ação e nome do usuário são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar atividade atual
    const atividadeResult = await pool.query(
      `SELECT id, numero_opd, atividade, status, tempo_acumulado_segundos, ultimo_inicio, logs, data_inicio
       FROM registros_atividades WHERE id = $1`,
      [parseInt(id)]
    );

    if (atividadeResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    const atividade = atividadeResult.rows[0];
    const agora = new Date().toISOString();
    let logs: LogAtividade[] = [];

    // Parse logs existentes
    if (atividade.logs) {
      try {
        logs = typeof atividade.logs === 'string'
          ? JSON.parse(atividade.logs)
          : atividade.logs;
      } catch {
        logs = [];
      }
    }

    let novoStatus: string;
    let tempoAcumulado = atividade.tempo_acumulado_segundos || 0;
    let ultimoInicio: string | null = atividade.ultimo_inicio;
    let acaoLog: 'INICIOU' | 'PAUSOU' | 'RETOMOU' | 'FINALIZOU';

    switch (acao) {
      case 'INICIAR':
        if (atividade.status !== 'A REALIZAR') {
          return NextResponse.json(
            { success: false, error: 'Só é possível iniciar atividades com status "A REALIZAR"' },
            { status: 400 }
          );
        }
        novoStatus = 'EM ANDAMENTO';
        ultimoInicio = agora;
        acaoLog = 'INICIOU';
        break;

      case 'PAUSAR':
        if (atividade.status !== 'EM ANDAMENTO') {
          return NextResponse.json(
            { success: false, error: 'Só é possível pausar atividades em andamento' },
            { status: 400 }
          );
        }
        novoStatus = 'PAUSADA';
        // Calcular tempo desde último início
        if (ultimoInicio) {
          const diff = Math.floor((new Date().getTime() - new Date(ultimoInicio).getTime()) / 1000);
          tempoAcumulado += diff;
        }
        ultimoInicio = null;
        acaoLog = 'PAUSOU';
        break;

      case 'RETOMAR':
        if (atividade.status !== 'PAUSADA') {
          return NextResponse.json(
            { success: false, error: 'Só é possível retomar atividades pausadas' },
            { status: 400 }
          );
        }
        novoStatus = 'EM ANDAMENTO';
        ultimoInicio = agora;
        acaoLog = 'RETOMOU';
        break;

      case 'FINALIZAR':
        if (atividade.status !== 'EM ANDAMENTO' && atividade.status !== 'PAUSADA') {
          return NextResponse.json(
            { success: false, error: 'Só é possível finalizar atividades em andamento ou pausadas' },
            { status: 400 }
          );
        }
        novoStatus = 'CONCLUÍDA';
        // Se estava em andamento, calcular tempo final
        if (atividade.status === 'EM ANDAMENTO' && ultimoInicio) {
          const diff = Math.floor((new Date().getTime() - new Date(ultimoInicio).getTime()) / 1000);
          tempoAcumulado += diff;
        }
        ultimoInicio = null;
        acaoLog = 'FINALIZOU';
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida' },
          { status: 400 }
        );
    }

    // Adicionar log
    logs.push({
      timestamp: agora,
      usuario_nome,
      usuario_id,
      acao: acaoLog
    });

    // Atualizar no banco - query separada para cada caso
    let result;

    if (acao === 'INICIAR') {
      result = await pool.query(`
        UPDATE registros_atividades
        SET status = $1, tempo_acumulado_segundos = $2, ultimo_inicio = $3, logs = $4, data_inicio = $5, updated = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [novoStatus, tempoAcumulado, ultimoInicio, JSON.stringify(logs), agora, parseInt(id)]);
    } else if (acao === 'FINALIZAR') {
      result = await pool.query(`
        UPDATE registros_atividades
        SET status = $1, tempo_acumulado_segundos = $2, ultimo_inicio = $3, logs = $4, data_termino = $5, updated = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [novoStatus, tempoAcumulado, ultimoInicio, JSON.stringify(logs), agora, parseInt(id)]);
    } else {
      result = await pool.query(`
        UPDATE registros_atividades
        SET status = $1, tempo_acumulado_segundos = $2, ultimo_inicio = $3, logs = $4, updated = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [novoStatus, tempoAcumulado, ultimoInicio, JSON.stringify(logs), parseInt(id)]);
    }

    // Enviar push notification para início e fim de tarefas
    try {
      if (acao === 'INICIAR') {
        await enviarNotificacaoPush(
          notificacoes.tarefaIniciada(atividade.numero_opd, atividade.atividade, usuario_nome)
        );
      } else if (acao === 'FINALIZAR') {
        await enviarNotificacaoPush(
          notificacoes.tarefaFinalizada(atividade.numero_opd, atividade.atividade, usuario_nome)
        );
      }
    } catch (notifError) {
      console.error('Erro ao enviar notificação:', notifError);
      // Não falha a operação se falhar a notificação
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Atividade ${acaoLog.toLowerCase()} com sucesso`
    });
  } catch (error) {
    console.error('Erro ao controlar timer:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao controlar timer' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
