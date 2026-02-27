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
  usou_template?: boolean;
}

// Nomes dos templates criados na Meta Business (v2 com encoding UTF-8 correto)
const TEMPLATES = {
  STATUS_CHECK: 'status_check_propostas_v2',
  ANALISE_ORCAMENTO: 'analise_orcamento_v2',
  PROPOSTA_APROVADA: 'proposta_aprovada_v2',
  PROPOSTA_REJEITADA: 'proposta_rejeitada_v2',
} as const;

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
 * Envia mensagem de template via WhatsApp Cloud API
 * Templates não precisam de janela de 24h (podem iniciar conversa)
 */
export async function enviarMensagemWhatsAppTemplate(
  telefone: string,
  templateName: string,
  parametros: string[],
  idioma: string = 'pt_BR'
): Promise<WhatsAppResult> {
  if (!WHATSAPP_TOKEN) {
    return { success: false, error: 'WHATSAPP_TOKEN não configurado' };
  }

  let tel = telefone.replace(/\D/g, '');
  if (!tel || tel.length < 10) {
    return { success: false, error: `Telefone inválido: ${telefone}` };
  }
  if (!tel.startsWith('55')) {
    tel = '55' + tel;
  }

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const components: Array<Record<string, unknown>> = [];
    if (parametros.length > 0) {
      components.push({
        type: 'body',
        parameters: parametros.map(p => ({ type: 'text', text: p })),
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: tel,
        type: 'template',
        template: {
          name: templateName,
          language: { code: idioma },
          components,
        },
      }),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, message_id: data.messages[0].id, usou_template: true };
    }

    const errorMsg = data.error?.message || JSON.stringify(data);
    console.error(`[WhatsApp] Erro template ${templateName}:`, errorMsg);
    return { success: false, error: errorMsg };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[WhatsApp] Exception template:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Envia mensagem com estratégia de fallback em 3 níveis:
 *
 * 1. Texto livre (funciona se houver janela de 24h)
 * 2. Template específico (funciona se APPROVED na Meta)
 * 3. Template hello_world para abrir janela + texto livre em seguida
 */
async function enviarComFallback(
  telefone: string,
  templateName: string,
  parametros: string[],
  mensagemFallback: string
): Promise<WhatsAppResult> {
  // 1. Tentar texto livre primeiro (funciona se houver janela 24h)
  const textoResult = await enviarMensagemWhatsApp(telefone, mensagemFallback);
  if (textoResult.success) {
    console.log(`[WhatsApp] Texto livre enviado com sucesso para ${telefone}`);
    return { ...textoResult, usou_template: false };
  }

  // 2. Sem janela 24h - tentar template específico (funciona se APPROVED)
  console.log(`[WhatsApp] Texto livre falhou (${textoResult.error}), tentando template ${templateName}...`);
  const templateResult = await enviarMensagemWhatsAppTemplate(telefone, templateName, parametros);
  if (templateResult.success) {
    console.log(`[WhatsApp] Template ${templateName} aceito pela Meta`);
    return templateResult;
  }

  // 3. Último recurso: enviar hello_world (APPROVED) para abrir janela, depois texto
  console.log(`[WhatsApp] Template falhou (${templateResult.error}), tentando hello_world + texto...`);
  const helloResult = await enviarMensagemWhatsAppTemplate(telefone, 'hello_world', [], 'en_US');
  if (helloResult.success) {
    console.log(`[WhatsApp] hello_world enviado, enviando texto real em seguida...`);
    // Aguardar brevemente para a janela ser aberta pela Meta
    await new Promise(r => setTimeout(r, 2000));
    const textoRetry = await enviarMensagemWhatsApp(telefone, mensagemFallback);
    if (textoRetry.success) {
      console.log(`[WhatsApp] Texto enviado com sucesso apos hello_world`);
      return { ...textoRetry, usou_template: false };
    }
    // Mesmo se o texto falhou, o hello_world já foi - retorna sucesso parcial
    console.log(`[WhatsApp] Texto apos hello_world falhou, mas hello_world foi entregue`);
    return { ...helloResult, usou_template: true };
  }

  // 4. Tudo falhou
  console.error(`[WhatsApp] Falha total: texto="${textoResult.error}" template="${templateResult.error}" hello_world="${helloResult.error}"`);
  return { success: false, error: `Texto: ${textoResult.error} | Template: ${templateResult.error}` };
}

// === Funções de envio por tipo ===

/**
 * Envia status check ao vendedor (template ou fallback)
 */
export async function enviarStatusCheck(
  telefone: string,
  vendedorNome: string,
  totalPropostas: number,
  link: string
): Promise<WhatsAppResult> {
  const primeiroNome = vendedorNome.split(' ')[0];
  return enviarComFallback(
    telefone,
    TEMPLATES.STATUS_CHECK,
    [primeiroNome, String(totalPropostas), link],
    montarMensagemStatusCheck(vendedorNome, totalPropostas, link)
  );
}

/**
 * Envia notificação de análise ao analista (template ou fallback)
 */
export async function enviarAnaliseOrcamento(
  telefone: string,
  vendedorNome: string,
  clienteEmpresa: string,
  produto: string,
  valorTotal: number,
  numeroProposta: number,
  link: string
): Promise<WhatsAppResult> {
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal);
  const numFmt = String(numeroProposta).padStart(4, '0');
  return enviarComFallback(
    telefone,
    TEMPLATES.ANALISE_ORCAMENTO,
    [numFmt, vendedorNome, clienteEmpresa, produto, valorFmt, link],
    montarMensagemAnalise(vendedorNome, clienteEmpresa, produto, valorTotal, numeroProposta, link)
  );
}

/**
 * Envia notificação de aprovação ao vendedor (template ou fallback)
 */
export async function enviarPropostaAprovada(
  telefone: string,
  vendedorNome: string,
  numeroProposta: number,
  clienteEmpresa: string,
  produto: string,
  valorFinal: number,
  linkPDF: string
): Promise<WhatsAppResult> {
  const primeiroNome = vendedorNome.split(' ')[0];
  const valorFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFinal);
  const numFmt = String(numeroProposta).padStart(4, '0');
  return enviarComFallback(
    telefone,
    TEMPLATES.PROPOSTA_APROVADA,
    [primeiroNome, numFmt, clienteEmpresa, produto, valorFmt, linkPDF],
    montarMensagemAprovacao(vendedorNome, numeroProposta, clienteEmpresa, produto, valorFinal, linkPDF)
  );
}

/**
 * Envia notificação de rejeição ao vendedor (template ou fallback)
 */
export async function enviarPropostaRejeitada(
  telefone: string,
  vendedorNome: string,
  numeroProposta: number,
  motivo: string
): Promise<WhatsAppResult> {
  const primeiroNome = vendedorNome.split(' ')[0];
  const numFmt = String(numeroProposta).padStart(4, '0');
  return enviarComFallback(
    telefone,
    TEMPLATES.PROPOSTA_REJEITADA,
    [primeiroNome, numFmt, motivo || 'Ajustes necessários'],
    montarMensagemRejeicao(vendedorNome, numeroProposta, motivo)
  );
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
