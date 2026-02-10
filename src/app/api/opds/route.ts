import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ATIVIDADES_PADRAO, getSubtarefasProducao, calcularPrevisaoInicio } from '@/lib/atividadesPadrao';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';
import { verificarPermissao } from '@/lib/auth';

export async function GET() {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    // Usar data_prevista_entrega como data_entrega para compatibilidade
    const result = await pool.query(`
      SELECT
        o.id,
        o.opd,
        o.numero,
        o.cliente,
        o.data_pedido,
        o.previsao_inicio,
        o.previsao_termino,
        o.data_prevista_entrega,
        o.data_prevista_entrega as data_entrega,
        o.inicio_producao,
        o.tipo_opd,
        o.tipo_produto,
        o.responsavel_opd,
        o.atividades_opd,
        o.anexo_pedido,
        o.registros_atividade,
        o.mensagens,
        o.created,
        o.updated,
        COUNT(ra.id) as total_atividades,
        SUM(CASE WHEN ra.status = 'CONCLUÍDA' THEN 1 ELSE 0 END) as atividades_concluidas,
        SUM(CASE WHEN ra.status = 'EM ANDAMENTO' THEN 1 ELSE 0 END) as atividades_em_andamento,
        SUM(CASE WHEN ra.status = 'A REALIZAR' THEN 1 ELSE 0 END) as atividades_a_realizar,
        CASE
          WHEN COUNT(ra.id) > 0
          THEN ROUND((SUM(CASE WHEN ra.status = 'CONCLUÍDA' THEN 1 ELSE 0 END)::numeric / COUNT(ra.id)::numeric * 100)::numeric, 1)
          ELSE 0
        END as percentual_conclusao
      FROM opds o
      LEFT JOIN registros_atividades ra ON o.numero = ra.numero_opd
      GROUP BY o.id, o.opd, o.numero, o.cliente, o.data_pedido, o.previsao_inicio, o.previsao_termino,
               o.data_prevista_entrega, o.inicio_producao, o.tipo_opd, o.tipo_produto, o.responsavel_opd, o.atividades_opd,
               o.anexo_pedido, o.registros_atividade, o.mensagens, o.created, o.updated
      ORDER BY o.numero DESC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error: any) {
    console.error('Erro ao buscar OPDs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { success: false, error: `Erro ao buscar OPDs: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await verificarPermissao('PRODUCAO', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const {
      numero,
      data_pedido,
      previsao_inicio,
      previsao_termino,
      data_prevista_entrega,
      inicio_producao,
      tipo_opd,
      tipo_produto,
      responsavel_opd,
      atividades_opd,
      anexo_pedido
    } = body;

    // Validação básica
    if (!numero) {
      return NextResponse.json(
        { success: false, error: 'Número da OPD é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe uma OPD com este número
    const existingOpd = await pool.query(
      'SELECT id FROM opds WHERE numero = $1',
      [numero]
    );

    if (existingOpd.rowCount && existingOpd.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma OPD com este número' },
        { status: 409 }
      );
    }

    const result = await pool.query(`
      INSERT INTO opds (
        numero,
        data_pedido,
        previsao_inicio,
        previsao_termino,
        data_prevista_entrega,
        inicio_producao,
        tipo_opd,
        tipo_produto,
        responsavel_opd,
        atividades_opd,
        anexo_pedido
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      numero,
      data_pedido || null,
      previsao_inicio || null,
      previsao_termino || null,
      data_prevista_entrega || null,
      inicio_producao || null,
      tipo_opd || null,
      tipo_produto || 'TOMBADOR',
      responsavel_opd || null,
      atividades_opd || null,
      anexo_pedido || null
    ]);

    const opdCriada = result.rows[0];

    // Criar atividades padrão automaticamente
    try {
      const dataPedidoDate = data_pedido ? new Date(data_pedido) : new Date();
      let producaoId: number | null = null;

      for (const atividadePadrao of ATIVIDADES_PADRAO) {
        const previsaoInicio = calcularPrevisaoInicio(dataPedidoDate, atividadePadrao.ordem);

        const atividadeResult = await pool.query(`
          INSERT INTO registros_atividades (
            numero_opd,
            atividade,
            responsavel,
            previsao_inicio,
            data_pedido,
            status
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          numero,
          atividadePadrao.atividade,
          atividadePadrao.responsavel,
          previsaoInicio.toISOString(),
          data_pedido || null,
          'A REALIZAR'
        ]);

        // Guardar o ID da atividade PRODUÇÃO para criar subtarefas
        if (atividadePadrao.atividade === 'PRODUÇÃO') {
          producaoId = atividadeResult.rows[0].id;
        }
      }

      // Criar subtarefas de PRODUÇÃO como filhas (baseado no tipo de produto)
      if (producaoId) {
        const tipoProdutoNormalizado = (tipo_produto === 'COLETOR' ? 'COLETOR' : 'TOMBADOR') as 'TOMBADOR' | 'COLETOR';
        const subtarefas = getSubtarefasProducao(tipoProdutoNormalizado);

        for (const subtarefa of subtarefas) {
          const previsaoInicio = calcularPrevisaoInicio(dataPedidoDate, 17 + subtarefa.ordem);

          await pool.query(`
            INSERT INTO registros_atividades (
              numero_opd,
              atividade,
              responsavel,
              previsao_inicio,
              data_pedido,
              status,
              parent_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            numero,
            subtarefa.atividade,
            subtarefa.responsavel,
            previsaoInicio.toISOString(),
            data_pedido || null,
            'A REALIZAR',
            producaoId
          ]);
        }
        console.log(`✅ ${subtarefas.length} subtarefas de PRODUÇÃO (${tipoProdutoNormalizado}) criadas para OPD ${numero}`);
      }

      console.log(`✅ ${ATIVIDADES_PADRAO.length} atividades padrão criadas para OPD ${numero}`);
    } catch (atividadeError) {
      console.error('Erro ao criar atividades padrão:', atividadeError);
      // Não falha a criação da OPD se falhar as atividades
    }

    // Enviar notificação push para todos os usuários
    try {
      await enviarNotificacaoPush(notificacoes.opdCriada(numero, responsavel_opd || 'Sistema'));
    } catch (notifError) {
      console.error('Erro ao enviar notificação:', notifError);
      // Não falha a criação se falhar a notificação
    }

    return NextResponse.json({
      success: true,
      data: opdCriada,
      message: 'OPD criada com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar OPD:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { success: false, error: `Erro ao criar OPD: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
