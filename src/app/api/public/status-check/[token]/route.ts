import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { registrarMudancaEstagio } from '@/lib/comercial/stageChange';

const ESTAGIOS_PERMITIDOS = ['EM_NEGOCIACAO', 'POS_NEGOCIACAO', 'FECHADA', 'PERDIDA', 'SUSPENSO'];

/**
 * GET /api/public/status-check/[token]
 * Público (sem auth) - Retorna dados do status check para o vendedor responder
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // Validar token e verificar expiração
    const checkResult = await query(
      `SELECT sc.*, v.nome as vendedor_nome
       FROM crm_status_checks sc
       JOIN crm_vendedores v ON sc.vendedor_id = v.id
       WHERE sc.token = $1`,
      [token]
    );

    if (!checkResult?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Link inválido' },
        { status: 404 }
      );
    }

    const check = checkResult.rows[0];

    if (new Date(check.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este link expirou. Solicite um novo ao administrador.' },
        { status: 410 }
      );
    }

    // Buscar items com dados da oportunidade
    const itemsResult = await query(
      `SELECT sci.id, sci.oportunidade_id, sci.estagio_anterior, sci.estagio_novo, sci.observacao, sci.respondido_at,
              o.titulo, o.valor_estimado, o.produto, o.numero_proposta, o.dias_no_estagio,
              c.razao_social as cliente_nome
       FROM crm_status_check_items sci
       JOIN crm_oportunidades o ON sci.oportunidade_id = o.id
       LEFT JOIN crm_clientes c ON o.cliente_id = c.id
       WHERE sci.status_check_id = $1
       ORDER BY o.valor_estimado DESC NULLS LAST`,
      [check.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        vendedor_nome: check.vendedor_nome,
        status: check.status,
        total_oportunidades: check.total_oportunidades,
        total_respondidas: check.total_respondidas,
        expires_at: check.expires_at,
        items: itemsResult?.rows || [],
      },
    });
  } catch (error) {
    console.error('Erro ao buscar status check:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/public/status-check/[token]
 * Público (sem auth) - Vendedor envia as respostas de status
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // Validar token
    const checkResult = await query(
      `SELECT sc.*, v.id as vid
       FROM crm_status_checks sc
       JOIN crm_vendedores v ON sc.vendedor_id = v.id
       WHERE sc.token = $1`,
      [token]
    );

    if (!checkResult?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Link inválido' },
        { status: 404 }
      );
    }

    const check = checkResult.rows[0];

    if (new Date(check.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este link expirou.' },
        { status: 410 }
      );
    }

    const body = await request.json();
    const respostas: Array<{ oportunidade_id: number; estagio_novo: string; observacao?: string; previsao_fechamento?: string }> = body.respostas || [];

    if (!respostas.length) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma resposta enviada' },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    for (const resp of respostas) {
      // Validar estágio permitido
      if (!ESTAGIOS_PERMITIDOS.includes(resp.estagio_novo)) continue;

      // Verificar que o item pertence a este status check
      let itemResult;
      try {
        itemResult = await query(
          `SELECT id, estagio_anterior FROM crm_status_check_items
           WHERE status_check_id = $1 AND oportunidade_id = $2 AND respondido_at IS NULL`,
          [check.id, resp.oportunidade_id]
        );
      } catch (e) {
        console.error('Erro ao buscar item do status check:', e);
        continue;
      }

      if (!itemResult?.rows?.length) continue;

      // Atualizar item
      try {
        await query(
          `UPDATE crm_status_check_items
           SET estagio_novo = $1, observacao = $2, respondido_at = NOW()
           WHERE id = $3`,
          [resp.estagio_novo, resp.observacao || null, itemResult.rows[0].id]
        );
      } catch (e) {
        console.error('Erro ao atualizar item do status check:', e);
        continue;
      }

      // Se o estágio mudou, aplicar mudança na oportunidade
      if (resp.estagio_novo !== itemResult.rows[0].estagio_anterior) {
        try {
          await registrarMudancaEstagio(
            resp.oportunidade_id,
            resp.estagio_novo,
            check.vendedor_id,
            'STATUS_CHECK_WHATSAPP'
          );
        } catch (e) {
          console.error('Erro ao registrar mudança de estágio:', e);
          // Atualizar estagio diretamente como fallback
          try {
            await query(
              `UPDATE crm_oportunidades SET estagio = $1, updated_at = NOW() WHERE id = $2`,
              [resp.estagio_novo, resp.oportunidade_id]
            );
          } catch (e2) {
            console.error('Erro ao atualizar estagio diretamente:', e2);
          }
        }
      }

      // Salvar previsão de fechamento se informada
      if (resp.previsao_fechamento) {
        try {
          await query(
            `UPDATE crm_oportunidades SET data_previsao_fechamento = $1, updated_at = NOW() WHERE id = $2`,
            [resp.previsao_fechamento, resp.oportunidade_id]
          );
        } catch (e) {
          console.error('Erro ao salvar previsão de fechamento:', e);
        }
      }

      // Registrar observação como interação (sempre que preenchida)
      if (resp.observacao?.trim()) {
        try {
          await query(
            `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
             VALUES ($1, 'ANOTACAO', $2)`,
            [resp.oportunidade_id, `[Status Check] ${resp.observacao.trim()}`]
          );
        } catch (e) {
          console.error('Erro ao registrar interação:', e);
        }
      }

      updatedCount++;
    }

    // Atualizar contadores do status check
    let totalRespondidas = updatedCount;
    let novoStatus = 'PARCIAL';
    try {
      const respondidas = await query(
        `SELECT COUNT(*) as cnt FROM crm_status_check_items
         WHERE status_check_id = $1 AND respondido_at IS NOT NULL`,
        [check.id]
      );
      totalRespondidas = parseInt(respondidas?.rows[0]?.cnt || '0');
      novoStatus = totalRespondidas >= check.total_oportunidades ? 'CONCLUIDO' : 'PARCIAL';
    } catch (e) {
      console.error('Erro ao contar respondidas:', e);
    }

    try {
      await query(
        `UPDATE crm_status_checks
         SET total_respondidas = $1, status = $2, updated_at = NOW()
         WHERE id = $3`,
        [totalRespondidas, novoStatus, check.id]
      );
      // Tentar atualizar respondido_at separadamente (coluna pode não existir em DBs legados)
      if (novoStatus === 'CONCLUIDO') {
        try {
          await query(
            `UPDATE crm_status_checks SET respondido_at = NOW() WHERE id = $1 AND respondido_at IS NULL`,
            [check.id]
          );
        } catch { /* ignora se coluna não existir */ }
      }
    } catch (e) {
      console.error('Erro ao atualizar status check:', e);
      // Tentar update mínimo sem updated_at
      try {
        await query(
          `UPDATE crm_status_checks SET total_respondidas = $1, status = $2 WHERE id = $3`,
          [totalRespondidas, novoStatus, check.id]
        );
      } catch (e2) {
        console.error('Erro no update mínimo do status check:', e2);
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      total_respondidas: totalRespondidas,
      status: novoStatus,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Erro ao processar respostas status-check:', msg, error);
    return NextResponse.json(
      { success: false, error: 'Erro interno', detail: msg },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
