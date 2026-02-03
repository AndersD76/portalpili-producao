import { NextResponse } from 'next/server';
import { chatQualidade } from '@/lib/qualidade/ia';

/**
 * Endpoint para chat com assistente de qualidade via IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mensagem, historico = [], contexto } = body;

    if (!mensagem) {
      return NextResponse.json(
        { success: false, error: 'Mensagem é obrigatória' },
        { status: 400 }
      );
    }

    const resposta = await chatQualidade(
      mensagem,
      historico.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      contexto
    );

    return NextResponse.json({
      success: true,
      data: {
        resposta,
      },
    });
  } catch (error: unknown) {
    console.error('Erro no chat:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao processar mensagem' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
