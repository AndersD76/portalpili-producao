import { NextResponse } from 'next/server';
import { analisarCliente, analisarProposta } from '@/lib/comercial/ia';
import { consultarCNPJ } from '@/lib/comercial/cnpj';

/**
 * Endpoint para análise via IA
 * Analisa clientes (CNPJ) ou propostas
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, dados } = body;

    if (!tipo || !dados) {
      return NextResponse.json(
        { success: false, error: 'Tipo e dados são obrigatórios' },
        { status: 400 }
      );
    }

    let resultado;

    switch (tipo) {
      case 'cliente':
        // Analisa cliente por CNPJ
        if (!dados.cnpj) {
          return NextResponse.json(
            { success: false, error: 'CNPJ é obrigatório para análise de cliente' },
            { status: 400 }
          );
        }

        // Busca dados do CNPJ se não fornecidos
        let dadosCNPJ = dados.dados_cnpj;
        if (!dadosCNPJ) {
          dadosCNPJ = await consultarCNPJ(dados.cnpj);
          if (!dadosCNPJ) {
            return NextResponse.json(
              { success: false, error: 'CNPJ não encontrado' },
              { status: 404 }
            );
          }
        }

        resultado = await analisarCliente(dadosCNPJ);
        break;

      case 'proposta':
        // Analisa proposta
        if (!dados.proposta) {
          return NextResponse.json(
            { success: false, error: 'Dados da proposta são obrigatórios' },
            { status: 400 }
          );
        }

        resultado = await analisarProposta(dados.proposta);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de análise inválido. Use: cliente ou proposta' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error: unknown) {
    console.error('Erro na análise IA:', error);

    // Verifica se é erro de API não configurada
    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao realizar análise' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
