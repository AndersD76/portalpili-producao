import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WABA_ID = process.env.WHATSAPP_WABA_ID || '26007499902247097';
const API_VERSION = 'v22.0';

// Templates com encoding UTF-8 correto
const TEMPLATES_TO_CREATE = [
  {
    name: 'status_check_propostas',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Ol\u00e1 {{1}}! Aqui \u00e9 a Pili Equipamentos.\n\nPrecisamos de uma atualiza\u00e7\u00e3o sobre {{2}} proposta(s) em negocia\u00e7\u00e3o.\n\nAcesse o link para atualizar:\n{{3}}\n\nEste link \u00e9 v\u00e1lido por 7 dias.\nObrigado!',
    example: ['Jo\u00e3o', '3', 'https://portalpili-producao-production.up.railway.app/status/abc123'],
  },
  {
    name: 'analise_orcamento',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Nova proposta para an\u00e1lise comercial!\n\nProposta N\u00ba {{1}}\nVendedor: {{2}}\nCliente: {{3}}\nProduto: {{4}}\nValor: {{5}}\n\nAcesse para revisar e aprovar:\n{{6}}\n\nLink v\u00e1lido por 7 dias.',
    example: ['0001', 'Jo\u00e3o Silva', 'Empresa ABC', 'Tombador', 'R$ 100.000,00', 'https://portalpili-producao-production.up.railway.app/analise/abc123'],
  },
  {
    name: 'proposta_aprovada',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Ol\u00e1 {{1}}! Sua proposta N\u00ba {{2}} foi aprovada!\n\nCliente: {{3}}\nProduto: {{4}}\nValor Final: {{5}}\n\nBaixe o PDF do or\u00e7amento:\n{{6}}\n\nEste link \u00e9 v\u00e1lido por 7 dias.',
    example: ['Jo\u00e3o', '0001', 'Empresa ABC', 'Tombador', 'R$ 100.000,00', 'https://portalpili-producao-production.up.railway.app/api/public/analise/abc123/pdf'],
  },
  {
    name: 'proposta_rejeitada',
    category: 'UTILITY',
    language: 'pt_BR',
    body: 'Ol\u00e1 {{1}}, a proposta N\u00ba {{2}} precisa de ajustes.\n\nMotivo: {{3}}\n\nAcesse o configurador para revisar e reenviar.',
    example: ['Jo\u00e3o', '0001', 'Valor acima do limite aprovado'],
  },
];

/**
 * DELETE /api/admin/whatsapp-templates
 * Deleta todos os 4 templates com encoding quebrado
 */
export async function DELETE() {
  const auth = await verificarPermissao('ADMIN', 'excluir');
  if (!auth.permitido) return auth.resposta;

  const results: Array<{ name: string; status: string; detail?: unknown }> = [];

  // Buscar templates existentes para pegar os IDs
  const listRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?fields=name,id,status&limit=20`,
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
  );
  const listData = await listRes.json();
  const existingTemplates = listData.data || [];

  const templateNames = TEMPLATES_TO_CREATE.map(t => t.name);

  for (const tmpl of existingTemplates) {
    if (!templateNames.includes(tmpl.name)) continue;

    try {
      const delRes = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?name=${tmpl.name}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
        }
      );
      const delData = await delRes.json();
      results.push({
        name: tmpl.name,
        status: delRes.ok ? 'DELETED' : 'ERROR',
        detail: delData,
      });
    } catch (e: unknown) {
      results.push({
        name: tmpl.name,
        status: 'ERROR',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ success: true, deleted: results });
}

/**
 * POST /api/admin/whatsapp-templates
 * Cria os 4 templates com encoding UTF-8 correto
 */
export async function POST() {
  const auth = await verificarPermissao('ADMIN', 'criar');
  if (!auth.permitido) return auth.resposta;

  const results: Array<{ name: string; status: string; detail?: unknown }> = [];

  for (const tmpl of TEMPLATES_TO_CREATE) {
    try {
      const payload = {
        name: tmpl.name,
        category: tmpl.category,
        language: tmpl.language,
        components: [
          {
            type: 'BODY',
            text: tmpl.body,
            example: {
              body_text: [tmpl.example],
            },
          },
        ],
      };

      const res = await fetch(
        `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      results.push({
        name: tmpl.name,
        status: res.ok ? 'CREATED' : 'ERROR',
        detail: data,
      });
    } catch (e: unknown) {
      results.push({
        name: tmpl.name,
        status: 'ERROR',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ success: true, created: results });
}

/**
 * GET /api/admin/whatsapp-templates
 * Lista status atual dos templates
 */
export async function GET() {
  const auth = await verificarPermissao('ADMIN', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates?fields=name,status,language,components,quality_score&limit=20`,
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
    );
    const data = await res.json();
    return NextResponse.json({ success: true, templates: data.data || data });
  } catch (e: unknown) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

export const dynamic = 'force-dynamic';
