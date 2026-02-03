import { NextResponse } from 'next/server';
import { gerarSugestoes, sugerirPreenchimento } from '@/lib/comercial/ia';
import { OportunidadeEstagio } from '@/types/comercial';

/**
 * Endpoint para sugestões da IA
 * Gera sugestões de próximos passos ou preenchimento de campos
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
      case 'proximos_passos':
        // Sugestões de próximos passos para oportunidade
        if (!dados.estagio) {
          return NextResponse.json(
            { success: false, error: 'Estágio da oportunidade é obrigatório' },
            { status: 400 }
          );
        }

        resultado = await gerarSugestoes(dados.estagio as OportunidadeEstagio, {
          cliente: dados.cliente,
          historico: dados.historico,
          valor_estimado: dados.valor_estimado,
          dias_no_estagio: dados.dias_no_estagio,
        });
        break;

      case 'preenchimento':
        // Sugestões de preenchimento de campos da proposta
        if (!dados.campos_preenchidos || !dados.campos_faltantes) {
          return NextResponse.json(
            { success: false, error: 'Campos preenchidos e faltantes são obrigatórios' },
            { status: 400 }
          );
        }

        resultado = await sugerirPreenchimento(
          dados.campos_preenchidos,
          dados.campos_faltantes
        );
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo de sugestão inválido. Use: proximos_passos ou preenchimento' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar sugestões:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao gerar sugestões' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
