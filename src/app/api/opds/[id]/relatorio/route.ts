import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Buscar dados da OPD
    const opdResult = await pool.query(`
      SELECT * FROM opds WHERE numero = $1
    `, [id]);

    if (opdResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'OPD não encontrada' },
        { status: 404 }
      );
    }

    const opd = opdResult.rows[0];

    // 2. Buscar todas as atividades com ordenação
    const atividadesResult = await pool.query(`
      SELECT
        id, atividade, responsavel, status,
        previsao_inicio, data_inicio, data_termino,
        tempo_acumulado_segundos, logs,
        tem_nao_conformidade, tem_pendencia_formulario,
        formulario_anexo, parent_id, created, updated
      FROM registros_atividades
      WHERE numero_opd = $1
      ORDER BY previsao_inicio ASC, id ASC
    `, [id]);

    // 3. Buscar formulários preenchidos
    const formulariosResult = await pool.query(`
      SELECT
        id, atividade_id, tipo_formulario, dados_formulario,
        preenchido_por, data_preenchimento, created
      FROM formularios_preenchidos
      WHERE numero_opd = $1
      ORDER BY created DESC
    `, [id]);

    // 4. Buscar comentários/chat
    const comentariosResult = await pool.query(`
      SELECT
        id, usuario_nome, mensagem, tipo, arquivos, created
      FROM comentarios_opd
      WHERE numero_opd = $1
      ORDER BY created ASC
    `, [id]);

    // 5. Buscar post-its
    const postitsResult = await pool.query(`
      SELECT
        id, descricao, responsavel, prazo, status, criado_por, criado_em
      FROM postits
      WHERE opd = $1
      ORDER BY criado_em DESC
    `, [id]);

    // 6. Buscar não conformidades relacionadas
    const ncsResult = await pool.query(`
      SELECT
        id, numero, status, gravidade, tipo, disposicao,
        descricao, quantidade_afetada as quantidade, data_ocorrencia,
        acao_imediata, acao_contencao, prazo_acoes, created
      FROM nao_conformidades
      WHERE numero_opd = $1
      ORDER BY created DESC
    `, [id]);

    // 7. Buscar ações corretivas relacionadas
    const acsResult = await pool.query(`
      SELECT
        id, numero, status, origem_tipo, origem_id, processos_envolvidos,
        causa_raiz_identificada, causas, acoes, responsavel_principal, prazo_conclusao, situacao_final, created
      FROM acoes_corretivas
      WHERE origem_tipo = 'NAO_CONFORMIDADE' AND origem_id IN (
        SELECT id FROM nao_conformidades WHERE numero_opd = $1
      )
      ORDER BY created DESC
    `, [id]);

    // 8. Calcular estatísticas
    const atividades = atividadesResult.rows;
    const stats = {
      total: atividades.length,
      concluidas: atividades.filter((a: any) => a.status === 'CONCLUÍDA').length,
      em_andamento: atividades.filter((a: any) => a.status === 'EM ANDAMENTO').length,
      pausadas: atividades.filter((a: any) => a.status === 'PAUSADA').length,
      a_realizar: atividades.filter((a: any) => a.status === 'A REALIZAR').length,
      com_nc: atividades.filter((a: any) => a.tem_nao_conformidade).length,
      com_pendencia: atividades.filter((a: any) => a.tem_pendencia_formulario).length,
    };

    // 9. Calcular tempo total trabalhado
    const tempoTotalSegundos = atividades.reduce((acc: number, a: any) => {
      return acc + (a.tempo_acumulado_segundos || 0);
    }, 0);

    // 10. Construir timeline de eventos
    const timeline: any[] = [];

    // Adicionar criação da OPD
    if (opd.created) {
      timeline.push({
        tipo: 'OPD_CRIADA',
        data: opd.created,
        descricao: `OPD ${id} criada`,
        usuario: opd.responsavel_opd || 'Sistema'
      });
    }

    // Adicionar eventos das atividades
    for (const atividade of atividades) {
      if (atividade.logs) {
        const logs = typeof atividade.logs === 'string'
          ? JSON.parse(atividade.logs)
          : atividade.logs;

        if (Array.isArray(logs)) {
          for (const log of logs) {
            timeline.push({
              tipo: `ATIVIDADE_${log.acao}`,
              data: log.timestamp,
              descricao: `${atividade.atividade} - ${log.acao}`,
              usuario: log.usuario_nome
            });
          }
        }
      }
    }

    // Adicionar formulários
    for (const form of formulariosResult.rows) {
      timeline.push({
        tipo: 'FORMULARIO_PREENCHIDO',
        data: form.created,
        descricao: `Formulário ${form.tipo_formulario} preenchido`,
        usuario: form.preenchido_por
      });
    }

    // Adicionar comentários
    for (const comentario of comentariosResult.rows) {
      timeline.push({
        tipo: 'COMENTARIO',
        data: comentario.created,
        descricao: `Mensagem de ${comentario.usuario_nome}`,
        usuario: comentario.usuario_nome
      });
    }

    // Adicionar NCs
    for (const nc of ncsResult.rows) {
      timeline.push({
        tipo: 'NC_CRIADA',
        data: nc.created,
        descricao: `NC ${nc.numero} registrada - ${nc.tipo}`,
        usuario: 'Sistema'
      });
    }

    // Ordenar timeline por data
    timeline.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    return NextResponse.json({
      success: true,
      data: {
        opd,
        atividades,
        formularios: formulariosResult.rows,
        comentarios: comentariosResult.rows,
        postits: postitsResult.rows,
        naoConformidades: ncsResult.rows,
        acoesCorretivas: acsResult.rows,
        stats,
        tempoTotalSegundos,
        timeline
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar relatório: ' + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
