import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { consultarCNPJ, enriquecerCliente, formatarCNPJ, limparCNPJ, validarCNPJCompleto } from '@/lib/comercial';
import { analisarCliente } from '@/lib/comercial/ia';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cnpj: string }> }
) {
  try {
    const { cnpj } = await params;
    const cnpjLimpo = limparCNPJ(cnpj);

    // Valida CNPJ
    if (!validarCNPJCompleto(cnpjLimpo)) {
      return NextResponse.json(
        { success: false, error: 'CNPJ inválido' },
        { status: 400 }
      );
    }

    // Verifica se já existe no banco
    const clienteExistente = await query(
      `SELECT * FROM crm_clientes WHERE cpf_cnpj = $1`,
      [cnpjLimpo]
    );

    // Consulta dados da Receita Federal
    const dadosCNPJ = await consultarCNPJ(cnpjLimpo);

    if (!dadosCNPJ) {
      return NextResponse.json(
        { success: false, error: 'CNPJ não encontrado na Receita Federal' },
        { status: 404 }
      );
    }

    // Enriquece com análise
    const enriquecimento = await enriquecerCliente(cnpjLimpo);

    // Tenta análise via IA (se configurada)
    let analiseIA = null;
    try {
      analiseIA = await analisarCliente(dadosCNPJ);
    } catch {
      // IA não configurada ou erro - continua sem análise
    }

    return NextResponse.json({
      success: true,
      data: {
        cnpj: formatarCNPJ(cnpjLimpo),
        dados_receita: dadosCNPJ,
        enriquecimento: enriquecimento ? {
          segmento_sugerido: enriquecimento.segmento_sugerido,
          potencial_estimado: enriquecimento.potencial_estimado,
          score_credito: enriquecimento.score_credito,
          regiao: enriquecimento.regiao,
          alertas: enriquecimento.alertas,
          tags_sugeridas: enriquecimento.tags_sugeridas,
          proximo_passo: enriquecimento.proximo_passo_sugerido,
        } : null,
        analise_ia: analiseIA || null,
        cliente_existente: clienteExistente?.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao consultar CNPJ' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
