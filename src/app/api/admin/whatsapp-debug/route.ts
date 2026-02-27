import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '993715913825388';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '26007499902247097';
const API_VERSION = 'v22.0';

/**
 * GET /api/admin/whatsapp-debug
 * Diagnostica problemas de envio WhatsApp
 */
export async function GET() {
  const auth = await verificarPermissao('ADMIN', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const results: Record<string, unknown> = {
    config: {
      phone_number_id: WHATSAPP_PHONE_NUMBER_ID,
      waba_id: WABA_ID,
      token_present: !!WHATSAPP_TOKEN,
      token_length: WHATSAPP_TOKEN.length,
    },
  };

  // 1. Verificar status do Phone Number
  try {
    const phoneRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,status`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    results.phone_number = await phoneRes.json();
  } catch (e: unknown) {
    results.phone_number_error = e instanceof Error ? e.message : String(e);
  }

  // 2. Listar templates e seus status
  try {
    const templatesRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?fields=name,status,language,components&limit=20`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    const templatesData = await templatesRes.json();
    results.templates = templatesData.data || templatesData;
  } catch (e: unknown) {
    results.templates_error = e instanceof Error ? e.message : String(e);
  }

  // 3. Verificar status de mensagens recentes (últimos wamids do DB)
  try {
    const { query } = await import('@/lib/db');
    const recent = await query(
      `SELECT mensagem_whatsapp_id, created_at, vendedor_id
       FROM crm_status_checks
       WHERE mensagem_whatsapp_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 3`
    );
    results.recent_messages = recent?.rows || [];
  } catch (e: unknown) {
    results.db_error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ success: true, debug: results });
}

/**
 * POST /api/admin/whatsapp-debug
 * Envia mensagem de teste
 */
export async function POST(request: Request) {
  const auth = await verificarPermissao('ADMIN', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const { telefone, tipo } = body;

    if (!telefone) {
      return NextResponse.json({ success: false, error: 'telefone obrigatório' }, { status: 400 });
    }

    let tel = telefone.replace(/\D/g, '');
    if (!tel.startsWith('55')) tel = '55' + tel;

    const url = `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    if (tipo === 'template') {
      // Testar template
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: tel,
          type: 'template',
          template: {
            name: 'status_check_propostas_v2',
            language: { code: 'pt_BR' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'Teste' },
                  { type: 'text', text: '1' },
                  { type: 'text', text: 'https://portalpili-producao-production.up.railway.app/status/teste' },
                ],
              },
            ],
          },
        }),
      });
      const data = await response.json();
      return NextResponse.json({
        success: response.ok,
        tipo: 'template',
        telefone_enviado: tel,
        http_status: response.status,
        response: data,
      });
    } else {
      // Testar texto livre
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: tel,
          type: 'text',
          text: { body: 'Teste de envio WhatsApp - Portal Pili' },
        }),
      });
      const data = await response.json();
      return NextResponse.json({
        success: response.ok,
        tipo: 'texto_livre',
        telefone_enviado: tel,
        http_status: response.status,
        response: data,
      });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
