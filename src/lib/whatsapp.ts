/**
 * WhatsApp Cloud API - Portal PILI
 *
 * Wrapper para envio de mensagens via Meta WhatsApp Business API.
 * Usa variáveis de ambiente para credenciais.
 */

const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '999238453273170';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || '';
const API_VERSION = 'v21.0';

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
