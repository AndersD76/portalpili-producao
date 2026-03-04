import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Portal Pili <noreply@pili.ind.br>';

function getTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export interface EmailResult {
  success: boolean;
  error?: string;
}

export async function enviarEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResult> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[Email] SMTP nao configurado - email nao enviado');
    return { success: false, error: 'SMTP nao configurado' };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });
    console.log(`[Email] Enviado para ${to}: ${subject}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[Email] Erro ao enviar para ${to}:`, msg);
    return { success: false, error: msg };
  }
}

export function buildEmailPreProposta(params: {
  numeroProposta: number;
  cliente: string;
  cnpj: string;
  produto: string;
  valorTotal: number;
  vendedor: string;
  link: string;
}): { subject: string; html: string } {
  const { numeroProposta, cliente, cnpj, produto, valorTotal, vendedor, link } = params;
  const num = String(numeroProposta).padStart(4, '0');
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valorTotal);

  const subject = `Pre-Proposta N. ${num} - ${cliente} - ${produto}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #DC2626; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">PILI Equipamentos Industriais</h1>
        <p style="color: #FCA5A5; margin: 4px 0 0 0; font-size: 14px;">Pre-Proposta Comercial N. ${num}</p>
      </div>
      <div style="background: #F9FAFB; padding: 24px; border: 1px solid #E5E7EB; border-top: none;">
        <p style="margin: 0 0 16px 0; color: #374151;">Uma nova pre-proposta foi enviada para analise comercial.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 12px; background: #F3F4F6; border: 1px solid #E5E7EB; font-weight: bold; color: #6B7280; width: 140px;">Cliente</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #111827;">${cliente}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F3F4F6; border: 1px solid #E5E7EB; font-weight: bold; color: #6B7280;">CNPJ</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #111827;">${cnpj}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F3F4F6; border: 1px solid #E5E7EB; font-weight: bold; color: #6B7280;">Produto</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #111827;">${produto}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F3F4F6; border: 1px solid #E5E7EB; font-weight: bold; color: #6B7280;">Valor Total</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #DC2626; font-weight: bold; font-size: 16px;">${valorFormatado}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #F3F4F6; border: 1px solid #E5E7EB; font-weight: bold; color: #6B7280;">Vendedor</td>
            <td style="padding: 8px 12px; border: 1px solid #E5E7EB; color: #111827;">${vendedor}</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="display: inline-block; background: #DC2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Revisar Pre-Proposta
          </a>
        </div>
        <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 20px;">
          Este e um email automatico enviado pelo Portal Pili.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}
