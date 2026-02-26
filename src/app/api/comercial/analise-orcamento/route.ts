import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';
import { enviarMensagemWhatsApp, formatarLinkAnalise, montarMensagemAnalise } from '@/lib/whatsapp';
import crypto from 'crypto';

/**
 * POST /api/comercial/analise-orcamento
 * Vendedor envia proposta para analise comercial via WhatsApp
 */
export async function POST(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const {
      dados_configurador,
      produto,
      quantidade,
      desconto_percentual,
      prazo_entrega,
      garantia_meses,
      forma_pagamento,
      observacoes,
      cnpj,
      cliente_empresa,
      cliente_nome,
      decisor_nome,
      decisor_telefone,
      decisor_email,
      valor_total,
      valor_equipamento,
      valor_opcionais,
    } = body;

    // Validar campos obrigatorios
    if (!produto || !cnpj || !cliente_empresa || !valor_total) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatorios: produto, cnpj, cliente_empresa, valor_total' },
        { status: 400 }
      );
    }

    // Buscar vendedor logado
    const vendedorResult = await query(
      `SELECT id, nome, email, whatsapp, telefone FROM crm_vendedores WHERE usuario_id = $1 AND ativo = true`,
      [auth.usuario.id]
    );

    if (!vendedorResult?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Vendedor nao encontrado para o usuario logado' },
        { status: 404 }
      );
    }

    const vendedor = vendedorResult.rows[0];

    // Buscar ou criar cliente por CNPJ
    let clienteId: number | null = null;
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const clienteExistente = await query(
      `SELECT id FROM crm_clientes WHERE cpf_cnpj = $1 LIMIT 1`,
      [cnpjLimpo]
    );

    if (clienteExistente?.rows?.length) {
      clienteId = clienteExistente.rows[0].id;
    } else {
      const novoCliente = await query(
        `INSERT INTO crm_clientes (razao_social, cpf_cnpj, contato_nome, vendedor_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [cliente_empresa, cnpjLimpo, cliente_nome || null, vendedor.id]
      );
      clienteId = novoCliente?.rows[0]?.id || null;
    }

    // Mapear produto para campos da proposta
    const isTombador = produto === 'TOMBADOR';
    const tamanho = dados_configurador?.tamanho;

    // Inserir proposta
    const propostaResult = await query(
      `INSERT INTO crm_propostas (
        vendedor_id, cliente_id, situacao, produto, dados_configurador,
        ${isTombador ? 'tombador_tamanho, tombador_preco_base, tombador_subtotal_opcionais, tombador_quantidade, tombador_total_geral' : 'coletor_quantidade, coletor_total_geral'},
        desconto_percentual, desconto_valor, prazo_entrega_dias, garantia_meses,
        valor_total, created_by
      ) VALUES (
        $1, $2, 'PENDENTE_ANALISE', $3, $4,
        ${isTombador ? '$5, $6, $7, $8, $9' : '$5, $6'},
        ${isTombador ? '$10, $11, $12, $13, $14, $15' : '$7, $8, $9, $10, $11, $12'}
      ) RETURNING id, numero_proposta`,
      isTombador
        ? [
            vendedor.id, clienteId, produto, JSON.stringify(dados_configurador),
            tamanho, valor_equipamento, valor_opcionais, quantidade, valor_total,
            desconto_percentual || 0, (valor_total * (desconto_percentual || 0)) / 100,
            parseInt(String(prazo_entrega).replace(/\D/g, '')) || 120,
            garantia_meses || 12, valor_total, auth.usuario.id,
          ]
        : [
            vendedor.id, clienteId, produto, JSON.stringify(dados_configurador),
            quantidade, valor_total,
            desconto_percentual || 0, (valor_total * (desconto_percentual || 0)) / 100,
            parseInt(String(prazo_entrega).replace(/\D/g, '')) || 120,
            garantia_meses || 12, valor_total, auth.usuario.id,
          ]
    );

    const propostaId = propostaResult?.rows[0]?.id;
    const numeroProposta = propostaResult?.rows[0]?.numero_proposta;

    // Gerar token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Inserir analise
    await query(
      `INSERT INTO crm_analise_orcamento (token, proposta_id, vendedor_id, status, expires_at)
       VALUES ($1, $2, $3, 'PENDENTE', $4)`,
      [token, propostaId, vendedor.id, expiresAt.toISOString()]
    );

    // Buscar WhatsApp do analista
    let analistaWhatsApp: string | null = null;
    try {
      const configResult = await query(
        `SELECT valor FROM crm_precos_config WHERE chave = 'whatsapp_analista'`
      );
      if (configResult?.rows?.length) {
        analistaWhatsApp = configResult.rows[0].valor;
      }
    } catch { /* ignore */ }
    if (!analistaWhatsApp) {
      analistaWhatsApp = process.env.WHATSAPP_ANALISTA_NUMERO || null;
    }

    // Enviar WhatsApp ao analista
    const link = formatarLinkAnalise(token);
    let whatsappSent = false;

    if (analistaWhatsApp) {
      const mensagem = montarMensagemAnalise(
        vendedor.nome,
        cliente_empresa,
        produto,
        valor_total,
        numeroProposta,
        link
      );
      console.log(`[AnaliseOrcamento] Enviando WhatsApp para analista (${analistaWhatsApp})`);
      const whatsappResult = await enviarMensagemWhatsApp(analistaWhatsApp, mensagem);
      console.log(`[AnaliseOrcamento] WhatsApp result:`, JSON.stringify(whatsappResult));
      whatsappSent = whatsappResult.success;

      if (whatsappResult.message_id) {
        await query(
          `UPDATE crm_analise_orcamento SET mensagem_whatsapp_id_analista = $1 WHERE token = $2`,
          [whatsappResult.message_id, token]
        );
      }
    } else {
      console.warn('[AnaliseOrcamento] WhatsApp do analista nao configurado');
    }

    return NextResponse.json({
      success: true,
      proposta_id: propostaId,
      numero_proposta: numeroProposta,
      link,
      whatsapp_sent: whatsappSent,
      message: whatsappSent
        ? 'Proposta enviada para analise via WhatsApp'
        : `Proposta criada. Link: ${link} (WhatsApp nao enviado)`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[AnaliseOrcamento] Erro:', msg);
    return NextResponse.json(
      { success: false, error: `Erro ao criar analise: ${msg}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
