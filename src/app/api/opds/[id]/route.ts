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
    const { motivo_alteracao, usuario_alteracao, ...dadosOPD } = body;

    // Buscar OPD atual para comparar mudanças
    const opdAtual = await pool.query('SELECT * FROM opds WHERE id = $1', [parseInt(id)]);
    if (opdAtual.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'OPD não encontrada' },
        { status: 404 }
      );
    }
    const opdAnterior = opdAtual.rows[0];

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

    // Rastrear mudanças de datas para propagação
    const datasAlteradas: { campo: string; anterior: string | null; novo: string | null }[] = [];

    for (const field of allowedFields) {
      if (field in dadosOPD) {
        updates.push(`${field} = $${paramCount}`);
        values.push(dadosOPD[field] || null);
        paramCount++;

        // Verificar se é uma data que mudou
        const camposData = ['previsao_inicio', 'previsao_termino', 'data_prevista_entrega', 'inicio_producao'];
        if (camposData.includes(field)) {
          const valorAnterior = opdAnterior[field] ? opdAnterior[field].toISOString().split('T')[0] : null;
          const valorNovo = dadosOPD[field] || null;
          if (valorAnterior !== valorNovo) {
            datasAlteradas.push({ campo: field, anterior: valorAnterior, novo: valorNovo });
          }
        }
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

    const opdAtualizada = result.rows[0];
    const numeroOpd = opdAtualizada.numero;

    // Propagar datas para as atividades se houver alterações
    if (datasAlteradas.length > 0) {
      // Lista de atividades pré-produção (ordem 1-16)
      const atividadesPreProducao = [
        'LIBERAÇÃO COMERCIAL',
        'LIBERAÇÃO FINANCEIRA',
        'DEFINIÇÃO DA OBRA CIVIL',
        'REUNIÃO DE START 1',
        'ENGENHARIA (MEC)',
        'ENGENHARIA (ELE/HID)',
        'REVISÃO FINAL DE PROJETOS',
        'REUNIÃO DE START 2',
        'PROGRAMAÇÃO DAS LINHAS',
        'RESERVAS DE COMP/FAB',
        'IMPRIMIR LISTAS E PLANOS',
        'ASSINATURA DOS PLANOS DE CORTE',
        'IMPRIMIR OF/ETIQUETA',
        'PROGRAMAÇÃO DE CORTE',
        "ENTREGAR OF'S/LISTAS PARA ALMOX",
        'SEPARAR LISTAS PARA A PRODUÇÃO'
      ];

      // Atividades de produção
      const atividadesProducao = ['PRODUÇÃO'];

      // Atividade de entrega
      const atividadeEntrega = ['ENTREGA'];

      for (const alteracao of datasAlteradas) {
        let atividadesParaAtualizar: string[] = [];
        let dataInicio: string | null = null;
        let dataTermino: string | null = null;

        if (alteracao.campo === 'previsao_inicio') {
          atividadesParaAtualizar = atividadesPreProducao;
          dataInicio = alteracao.novo;
        } else if (alteracao.campo === 'previsao_termino') {
          atividadesParaAtualizar = atividadesPreProducao;
          dataTermino = alteracao.novo;
        } else if (alteracao.campo === 'inicio_producao') {
          atividadesParaAtualizar = atividadesProducao;
          dataInicio = alteracao.novo;
        } else if (alteracao.campo === 'data_prevista_entrega') {
          atividadesParaAtualizar = atividadeEntrega;
          dataInicio = alteracao.novo;
          dataTermino = alteracao.novo;
        }

        // Atualizar atividades
        if (atividadesParaAtualizar.length > 0) {
          if (dataInicio) {
            await pool.query(`
              UPDATE registros_atividades
              SET previsao_inicio = $1, updated = CURRENT_TIMESTAMP
              WHERE numero_opd = $2 AND atividade = ANY($3)
            `, [dataInicio, numeroOpd, atividadesParaAtualizar]);
          }
          if (dataTermino) {
            await pool.query(`
              UPDATE registros_atividades
              SET data_termino = $1, updated = CURRENT_TIMESTAMP
              WHERE numero_opd = $2 AND atividade = ANY($3) AND status != 'CONCLUÍDA'
            `, [dataTermino, numeroOpd, atividadesParaAtualizar]);
          }
        }

        // Registrar log nas atividades afetadas
        const logEntry = {
          timestamp: new Date().toISOString(),
          tipo: 'ALTERACAO_DATA',
          campo: alteracao.campo,
          valor_anterior: alteracao.anterior,
          valor_novo: alteracao.novo,
          motivo: motivo_alteracao || 'Não informado',
          usuario: usuario_alteracao || 'Sistema'
        };

        await pool.query(`
          UPDATE registros_atividades
          SET logs = COALESCE(logs, '[]'::jsonb) || $1::jsonb
          WHERE numero_opd = $2 AND atividade = ANY($3)
        `, [JSON.stringify([logEntry]), numeroOpd, atividadesParaAtualizar]);
      }

      // Registrar log geral de alteração na OPD
      const logOPD = {
        timestamp: new Date().toISOString(),
        tipo: 'ALTERACAO_DATAS',
        alteracoes: datasAlteradas,
        motivo: motivo_alteracao || 'Não informado',
        usuario: usuario_alteracao || 'Sistema'
      };

      // Adicionar ao histórico se tiver mudança de data de entrega
      const mudouDataEntrega = datasAlteradas.find(a => a.campo === 'data_prevista_entrega');
      if (mudouDataEntrega) {
        const historicoAtual = opdAtualizada.historico_data_entrega || [];
        historicoAtual.push({
          data_anterior: mudouDataEntrega.anterior,
          data_nova: mudouDataEntrega.novo,
          motivo: motivo_alteracao || 'Não informado',
          usuario: usuario_alteracao || 'Sistema',
          data_alteracao: new Date().toISOString()
        });
        await pool.query(
          'UPDATE opds SET historico_data_entrega = $1 WHERE id = $2',
          [JSON.stringify(historicoAtual), parseInt(id)]
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: opdAtualizada,
      datasAlteradas,
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
    const opdId = parseInt(id);

    if (isNaN(opdId)) {
      return NextResponse.json(
        { success: false, error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se a OPD existe e pegar o número
    const checkResult = await pool.query(
      'SELECT id, numero FROM opds WHERE id = $1',
      [opdId]
    );

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'OPD não encontrada' },
        { status: 404 }
      );
    }

    const numeroOpd = checkResult.rows[0].numero;

    // 1. Buscar IDs das atividades relacionadas
    const atividadesResult = await pool.query(
      'SELECT id FROM registros_atividades WHERE numero_opd = $1',
      [numeroOpd]
    );
    const atividadeIds = atividadesResult.rows.map(r => r.id);

    // 2. Deletar formulários preenchidos das atividades (se existirem)
    if (atividadeIds.length > 0) {
      try {
        await pool.query(
          'DELETE FROM formularios_preenchidos WHERE atividade_id = ANY($1)',
          [atividadeIds]
        );
      } catch (formError) {
        console.log('Aviso ao deletar formulários:', formError);
      }
    }

    // 3. Deletar atividades relacionadas
    try {
      await pool.query('DELETE FROM registros_atividades WHERE numero_opd = $1', [numeroOpd]);
    } catch (atividadesError) {
      console.log('Aviso ao deletar atividades:', atividadesError);
    }

    // 4. Deletar a OPD
    await pool.query('DELETE FROM opds WHERE id = $1', [opdId]);

    return NextResponse.json({
      success: true,
      message: 'OPD deletada com sucesso'
    });
  } catch (error: any) {
    console.error('Erro ao deletar OPD:', error);
    return NextResponse.json(
      { success: false, error: `Erro ao deletar OPD: ${error?.message || 'Erro desconhecido'}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
