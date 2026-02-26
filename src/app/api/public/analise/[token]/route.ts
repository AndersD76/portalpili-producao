import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { enviarPropostaRejeitada } from '@/lib/whatsapp';

/**
 * GET /api/public/analise/[token]
 * Retorna dados da proposta para o analista revisar (sem auth)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const result = await query(
      `SELECT a.*,
              p.numero_proposta, p.produto, p.dados_configurador, p.valor_total,
              p.desconto_percentual, p.prazo_entrega_dias, p.garantia_meses,
              p.tombador_tamanho, p.tombador_preco_base, p.tombador_subtotal_opcionais,
              p.tombador_quantidade, p.tombador_total_geral,
              p.coletor_quantidade, p.coletor_total_geral,
              v.nome as vendedor_nome, v.email as vendedor_email,
              c.razao_social as cliente_nome, c.cpf_cnpj as cliente_cnpj
       FROM crm_analise_orcamento a
       JOIN crm_propostas p ON a.proposta_id = p.id
       JOIN crm_vendedores v ON a.vendedor_id = v.id
       LEFT JOIN crm_clientes c ON p.cliente_id = c.id
       WHERE a.token = $1`,
      [token]
    );

    if (!result?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Link invalido ou nao encontrado' },
        { status: 404 }
      );
    }

    const analise = result.rows[0];

    // Verificar expiracao
    if (new Date(analise.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este link expirou' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        status: analise.status,
        expires_at: analise.expires_at,
        aprovado_em: analise.aprovado_em,
        observacoes_analista: analise.observacoes_analista,
        pdf_gerado_em: analise.pdf_gerado_em,
        vendedor_nome: analise.vendedor_nome,
        vendedor_email: analise.vendedor_email,
        cliente_nome: analise.cliente_nome,
        cliente_cnpj: analise.cliente_cnpj,
        proposta: {
          numero_proposta: analise.numero_proposta,
          produto: analise.produto,
          dados_configurador: analise.dados_configurador,
          valor_total: parseFloat(analise.valor_total),
          desconto_percentual: parseFloat(analise.desconto_percentual || '0'),
          prazo_entrega_dias: analise.prazo_entrega_dias,
          garantia_meses: analise.garantia_meses,
        },
        // Ajustes do analista (se ja processada)
        ajustes: analise.status !== 'PENDENTE' ? {
          desconto_percentual: analise.desconto_percentual_ajustado != null ? parseFloat(analise.desconto_percentual_ajustado) : null,
          prazo_entrega: analise.prazo_entrega_ajustado,
          garantia_meses: analise.garantia_meses_ajustado,
          forma_pagamento: analise.forma_pagamento_ajustada,
          observacoes: analise.observacoes_analista,
        } : null,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[AnalisePublic GET] Erro:', msg);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/public/analise/[token]
 * Analista aprova ou rejeita a proposta (sem auth)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const body = await request.json();
    const {
      acao,
      desconto_percentual,
      prazo_entrega,
      garantia_meses,
      forma_pagamento,
      observacoes_analista,
    } = body;

    if (!acao || !['APROVAR', 'REJEITAR'].includes(acao)) {
      return NextResponse.json(
        { success: false, error: 'acao deve ser APROVAR ou REJEITAR' },
        { status: 400 }
      );
    }

    // Buscar analise
    const analiseResult = await query(
      `SELECT a.*, p.numero_proposta, p.produto, p.valor_total, p.dados_configurador,
              v.nome as vendedor_nome, v.whatsapp as vendedor_whatsapp, v.telefone as vendedor_telefone,
              c.razao_social as cliente_nome
       FROM crm_analise_orcamento a
       JOIN crm_propostas p ON a.proposta_id = p.id
       JOIN crm_vendedores v ON a.vendedor_id = v.id
       LEFT JOIN crm_clientes c ON p.cliente_id = c.id
       WHERE a.token = $1`,
      [token]
    );

    if (!analiseResult?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Link invalido' },
        { status: 404 }
      );
    }

    const analise = analiseResult.rows[0];

    // Verificar expiracao
    if (new Date(analise.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este link expirou' },
        { status: 410 }
      );
    }

    // Verificar se ja foi processada
    if (analise.status !== 'PENDENTE') {
      return NextResponse.json(
        { success: false, error: `Proposta ja foi ${analise.status.toLowerCase()}`, status: analise.status },
        { status: 409 }
      );
    }

    if (acao === 'APROVAR') {
      // Atualizar analise
      await query(
        `UPDATE crm_analise_orcamento SET
          status = 'APROVADA',
          aprovado_em = NOW(),
          desconto_percentual_ajustado = $1,
          prazo_entrega_ajustado = $2,
          garantia_meses_ajustado = $3,
          forma_pagamento_ajustada = $4,
          observacoes_analista = $5,
          updated_at = NOW()
        WHERE token = $6`,
        [
          desconto_percentual ?? null,
          prazo_entrega ?? null,
          garantia_meses ?? null,
          forma_pagamento ?? null,
          observacoes_analista ?? null,
          token,
        ]
      );

      // Atualizar proposta
      await query(
        `UPDATE crm_propostas SET situacao = 'APROVADA', updated_at = NOW() WHERE id = $1`,
        [analise.proposta_id]
      );

      return NextResponse.json({
        success: true,
        message: 'Proposta aprovada',
        data: {
          numero_proposta: analise.numero_proposta,
          produto: analise.produto,
          vendedor_nome: analise.vendedor_nome,
          cliente_nome: analise.cliente_nome,
          valor_total: parseFloat(analise.valor_total),
        },
      });
    } else {
      // REJEITAR
      await query(
        `UPDATE crm_analise_orcamento SET
          status = 'REJEITADA',
          observacoes_analista = $1,
          updated_at = NOW()
        WHERE token = $2`,
        [observacoes_analista ?? '', token]
      );

      await query(
        `UPDATE crm_propostas SET situacao = 'REJEITADA', updated_at = NOW() WHERE id = $1`,
        [analise.proposta_id]
      );

      // Enviar WhatsApp de rejeicao ao vendedor (template com fallback)
      const vendedorWhats = analise.vendedor_whatsapp || analise.vendedor_telefone;
      if (vendedorWhats) {
        await enviarPropostaRejeitada(
          vendedorWhats,
          analise.vendedor_nome,
          analise.numero_proposta,
          observacoes_analista || ''
        ).catch(e =>
          console.error('[AnalisePublic] Erro WhatsApp rejeicao:', e)
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Proposta rejeitada',
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[AnalisePublic PUT] Erro:', msg);
    return NextResponse.json(
      { success: false, error: 'Erro ao processar' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
