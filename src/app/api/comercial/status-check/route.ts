import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';
import { enviarMensagemWhatsApp, formatarLinkStatusCheck, montarMensagemStatusCheck } from '@/lib/whatsapp';
import crypto from 'crypto';

/**
 * POST /api/comercial/status-check
 * Admin cria um status check e envia WhatsApp ao vendedor
 */
export async function POST(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const { vendedor_id, oportunidade_ids } = body;

    if (!vendedor_id || !oportunidade_ids?.length) {
      return NextResponse.json(
        { success: false, error: 'vendedor_id e oportunidade_ids são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do vendedor
    const vendedorResult = await query(
      `SELECT id, nome, whatsapp, telefone FROM crm_vendedores WHERE id = $1`,
      [vendedor_id]
    );

    if (!vendedorResult?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Vendedor não encontrado' },
        { status: 404 }
      );
    }

    const vendedor = vendedorResult.rows[0];
    const whatsappNum = vendedor.whatsapp || vendedor.telefone;

    if (!whatsappNum) {
      return NextResponse.json(
        { success: false, error: `Vendedor ${vendedor.nome} não tem WhatsApp/telefone cadastrado` },
        { status: 400 }
      );
    }

    // Gerar token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 dias

    // Criar status check
    const checkResult = await query(
      `INSERT INTO crm_status_checks (token, vendedor_id, criado_por, total_oportunidades, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [token, vendedor_id, auth.usuario.id, oportunidade_ids.length, expiresAt.toISOString()]
    );

    const checkId = checkResult?.rows[0]?.id;

    // Inserir items (cada oportunidade)
    for (const oppId of oportunidade_ids) {
      const oppResult = await query(
        `SELECT estagio FROM crm_oportunidades WHERE id = $1`,
        [oppId]
      );
      const estagioAtual = oppResult?.rows[0]?.estagio || 'EM_NEGOCIACAO';

      await query(
        `INSERT INTO crm_status_check_items (status_check_id, oportunidade_id, estagio_anterior)
         VALUES ($1, $2, $3)`,
        [checkId, oppId, estagioAtual]
      );
    }

    // Enviar WhatsApp
    const link = formatarLinkStatusCheck(token);
    const mensagem = montarMensagemStatusCheck(vendedor.nome, oportunidade_ids.length, link);
    const whatsappResult = await enviarMensagemWhatsApp(whatsappNum, mensagem);

    // Salvar ID da mensagem
    if (whatsappResult.message_id) {
      await query(
        `UPDATE crm_status_checks SET mensagem_whatsapp_id = $1 WHERE id = $2`,
        [whatsappResult.message_id, checkId]
      );
    }

    // Registrar interação em cada oportunidade
    for (const oppId of oportunidade_ids) {
      try {
        await query(
          `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
           VALUES ($1, 'WHATSAPP', $2)`,
          [oppId, `Status check enviado via WhatsApp para ${vendedor.nome}`]
        );
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      success: true,
      token,
      link,
      whatsapp_enviado: whatsappResult.success,
      whatsapp_erro: whatsappResult.error || null,
      message: whatsappResult.success
        ? `Status check enviado via WhatsApp para ${vendedor.nome}`
        : `Status check criado, mas WhatsApp falhou: ${whatsappResult.error}. Link: ${link}`,
    });
  } catch (error) {
    console.error('Erro ao criar status check:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar status check' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comercial/status-check
 * Admin lista histórico de status checks
 */
export async function GET(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const result = await query(`
      SELECT sc.*, v.nome as vendedor_nome
      FROM crm_status_checks sc
      JOIN crm_vendedores v ON sc.vendedor_id = v.id
      ORDER BY sc.created_at DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
    });
  } catch (error) {
    console.error('Erro ao listar status checks:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao listar status checks' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
