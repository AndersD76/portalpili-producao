/**
 * WhatsApp Cloud API - Portal PILI
 *
 * Wrapper para envio de mensagens via Meta WhatsApp Business API.
 * Usa variáveis de ambiente para credenciais.
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '993715913825388';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const API_VERSION = 'v22.0';

export interface WhatsAppResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API
 */
export async function enviarMensagemWhatsApp(
  telefone: string,
  mensagem: string
): Promise<WhatsAppResult> {
  if (!WHATSAPP_TOKEN) {
    return { success: false, error: 'WHATSAPP_TOKEN não configurado' };
  }

  // Limpar telefone (só números) e garantir código do país 55
  let tel = telefone.replace(/\D/g, '');
  if (!tel || tel.length < 10) {
    return { success: false, error: `Telefone inválido: ${telefone}` };
  }
  // Adicionar código do país 55 se não presente
  if (!tel.startsWith('55')) {
    tel = '55' + tel;
  }

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: tel,
        type: 'text',
        text: { body: mensagem },
      }),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, message_id: data.messages[0].id };
    }

    const errorMsg = data.error?.message || JSON.stringify(data);
    console.error('[WhatsApp] Erro ao enviar:', errorMsg);
    return { success: false, error: errorMsg };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[WhatsApp] Exception:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Monta URL pública do status check
 */
export function formatarLinkStatusCheck(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalpili-producao-production.up.railway.app';
  return `${baseUrl}/status/${token}`;
}

/**
 * Monta mensagem de texto para o vendedor
 */
export function montarMensagemStatusCheck(
  vendedorNome: string,
  totalPropostas: number,
  link: string
): string {
  const primeiroNome = vendedorNome.split(' ')[0];
  return (
    `Ola ${primeiroNome}! Aqui e a Pili Equipamentos.\n\n` +
    `Precisamos de uma atualizacao sobre ${totalPropostas} proposta${totalPropostas > 1 ? 's' : ''} em negociacao.\n\n` +
    `Acesse o link para atualizar:\n${link}\n\n` +
    `Este link e valido por 7 dias.\nObrigado!`
  );
}

// === Analise de Orcamento ===

export function formatarLinkAnalise(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalpili-producao-production.up.railway.app';
  return `${baseUrl}/analise/${token}`;
}

export function formatarLinkPDFAnalise(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portalpili-producao-production.up.railway.app';
  return `${baseUrl}/api/public/analise/${token}/pdf`;
}

export function montarMensagemAnalise(
  vendedorNome: string,
  clienteEmpresa: string,
  produto: string,
  valorTotal: number,
  numeroProposta: number,
  link: string
): string {
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal);
  const numFmt = String(numeroProposta).padStart(4, '0');
  return (
    `Nova proposta para analise comercial!\n\n` +
    `Proposta N. ${numFmt}\n` +
    `Vendedor: ${vendedorNome}\n` +
    `Cliente: ${clienteEmpresa}\n` +
    `Produto: ${produto}\n` +
    `Valor: ${valorFmt}\n\n` +
    `Acesse para revisar e aprovar:\n${link}\n\n` +
    `Link valido por 7 dias.`
  );
}

export function montarMensagemAprovacao(
  vendedorNome: string,
  numeroProposta: number,
  clienteEmpresa: string,
  produto: string,
  valorFinal: number,
  linkPDF: string
): string {
  const primeiroNome = vendedorNome.split(' ')[0];
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFinal);
  const numFmt = String(numeroProposta).padStart(4, '0');
  return (
    `Ola ${primeiroNome}! Sua proposta N. ${numFmt} foi aprovada!\n\n` +
    `Cliente: ${clienteEmpresa}\n` +
    `Produto: ${produto}\n` +
    `Valor Final: ${valorFmt}\n\n` +
    `Baixe o PDF do orcamento:\n${linkPDF}\n\n` +
    `Este link e valido por 7 dias.`
  );
}

export function montarMensagemRejeicao(
  vendedorNome: string,
  numeroProposta: number,
  motivo: string
): string {
  const primeiroNome = vendedorNome.split(' ')[0];
  const numFmt = String(numeroProposta).padStart(4, '0');
  return (
    `Ola ${primeiroNome}, a proposta N. ${numFmt} precisa de ajustes.\n\n` +
    (motivo ? `Motivo: ${motivo}\n\n` : '') +
    `Acesse o configurador para revisar e reenviar.`
  );
}
