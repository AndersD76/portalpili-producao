import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  enviarPropostaAprovada,
  formatarLinkPDFAnalise,
} from '@/lib/whatsapp';

/**
 * POST /api/public/analise/[token]/pdf
 * Analista envia o PDF gerado no browser para armazenamento
 * Dispara WhatsApp ao vendedor com link de download
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    // Buscar analise
    const analiseResult = await query(
      `SELECT a.*, p.numero_proposta, p.produto, p.valor_total,
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
        { success: false, error: 'Token invalido' },
        { status: 404 }
      );
    }

    const analise = analiseResult.rows[0];

    if (analise.status !== 'APROVADA') {
      return NextResponse.json(
        { success: false, error: 'Proposta precisa ser aprovada antes de enviar o PDF' },
        { status: 400 }
      );
    }

    // Ler PDF do request body
    const pdfBuffer = await request.arrayBuffer();
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: 'PDF vazio' },
        { status: 400 }
      );
    }

    // Converter para base64
    const base64 = Buffer.from(pdfBuffer).toString('base64');

    // Salvar no DB
    await query(
      `UPDATE crm_analise_orcamento SET pdf_data = $1, pdf_gerado_em = NOW(), updated_at = NOW() WHERE token = $2`,
      [base64, token]
    );

    await query(
      `UPDATE crm_propostas SET pdf_gerado_em = NOW(), updated_at = NOW() WHERE id = $1`,
      [analise.proposta_id]
    );

    // Enviar WhatsApp ao vendedor com link do PDF
    const vendedorWhats = analise.vendedor_whatsapp || analise.vendedor_telefone;
    let whatsappSent = false;
    const linkPDF = formatarLinkPDFAnalise(token);

    // Recalcular valor final considerando ajuste de desconto
    let valorFinal = parseFloat(analise.valor_total);
    if (analise.desconto_percentual_ajustado != null) {
      const dadosConfig = analise.dados_configurador || {};
      const subtotal = dadosConfig.subtotal || valorFinal;
      const descValor = subtotal * (parseFloat(analise.desconto_percentual_ajustado) / 100);
      valorFinal = subtotal - descValor;
    }

    if (vendedorWhats) {
      console.log(`[AnalisePDF] Enviando WhatsApp ao vendedor ${analise.vendedor_nome} (${vendedorWhats})`);
      const result = await enviarPropostaAprovada(
        vendedorWhats,
        analise.vendedor_nome,
        analise.numero_proposta,
        analise.cliente_nome || 'Cliente',
        analise.produto,
        valorFinal,
        linkPDF
      );
      whatsappSent = result.success;

      if (result.message_id) {
        await query(
          `UPDATE crm_analise_orcamento SET mensagem_whatsapp_id_vendedor = $1 WHERE token = $2`,
          [result.message_id, token]
        );
      }
    }

    return NextResponse.json({
      success: true,
      pdf_link: linkPDF,
      whatsapp_sent: whatsappSent,
      message: whatsappSent
        ? `PDF salvo e enviado ao vendedor ${analise.vendedor_nome} via WhatsApp`
        : `PDF salvo. Link: ${linkPDF} (WhatsApp nao enviado)`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[AnalisePDF POST] Erro:', msg);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar PDF' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/public/analise/[token]/pdf
 * Download do PDF armazenado
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const result = await query(
      `SELECT a.pdf_data, a.expires_at, p.numero_proposta, p.produto
       FROM crm_analise_orcamento a
       JOIN crm_propostas p ON a.proposta_id = p.id
       WHERE a.token = $1`,
      [token]
    );

    if (!result?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Link invalido' },
        { status: 404 }
      );
    }

    const { pdf_data, expires_at, numero_proposta, produto } = result.rows[0];

    if (!pdf_data) {
      return NextResponse.json(
        { success: false, error: 'PDF ainda nao foi gerado' },
        { status: 404 }
      );
    }

    // Verificar expiracao
    if (new Date(expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este link expirou' },
        { status: 410 }
      );
    }

    // Decodificar base64 e retornar PDF
    const pdfBuffer = Buffer.from(pdf_data, 'base64');
    const numFmt = String(numero_proposta).padStart(4, '0');
    const data = new Date().toISOString().split('T')[0];
    const nomeArquivo = `orcamento-pili-${numFmt}-${(produto || 'equipamento').toLowerCase()}-${data}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${nomeArquivo}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[AnalisePDF GET] Erro:', msg);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar PDF' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
