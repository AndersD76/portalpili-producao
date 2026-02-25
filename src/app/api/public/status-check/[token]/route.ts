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
    const respostas: Array<{ oportunidade_id: number; estagio_novo: string; observacao?: string }> = body.respostas || [];

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
      const itemResult = await query(
        `SELECT id, estagio_anterior FROM crm_status_check_items
         WHERE status_check_id = $1 AND oportunidade_id = $2 AND respondido_at IS NULL`,
        [check.id, resp.oportunidade_id]
      );

      if (!itemResult?.rows?.length) continue;

      // Atualizar item
      await query(
        `UPDATE crm_status_check_items
         SET estagio_novo = $1, observacao = $2, respondido_at = NOW()
         WHERE id = $3`,
        [resp.estagio_novo, resp.observacao || null, itemResult.rows[0].id]
      );

      // Se o estágio mudou, aplicar mudança na oportunidade
      if (resp.estagio_novo !== itemResult.rows[0].estagio_anterior) {
        await registrarMudancaEstagio(
          resp.oportunidade_id,
          resp.estagio_novo,
          check.vendedor_id,
          'STATUS_CHECK_WHATSAPP'
        );

        // Se observação fornecida, registrar como interação
        if (resp.observacao?.trim()) {
          try {
            await query(
              `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
               VALUES ($1, 'ANOTACAO', $2)`,
              [resp.oportunidade_id, `[Status Check] ${resp.observacao.trim()}`]
            );
          } catch { /* ignore */ }
        }
      }

      updatedCount++;
    }

    // Atualizar contadores do status check
    const respondidas = await query(
      `SELECT COUNT(*) as cnt FROM crm_status_check_items
       WHERE status_check_id = $1 AND respondido_at IS NOT NULL`,
      [check.id]
    );
    const totalRespondidas = parseInt(respondidas?.rows[0]?.cnt || '0');
    const novoStatus = totalRespondidas >= check.total_oportunidades ? 'CONCLUIDO' : 'PARCIAL';

    await query(
      `UPDATE crm_status_checks
       SET total_respondidas = $1, status = $2, respondido_at = CASE WHEN $2 = 'CONCLUIDO' THEN NOW() ELSE respondido_at END, updated_at = NOW()
       WHERE id = $3`,
      [totalRespondidas, novoStatus, check.id]
    );

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      total_respondidas: totalRespondidas,
      status: novoStatus,
    });
  } catch (error) {
    console.error('Erro ao processar respostas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
