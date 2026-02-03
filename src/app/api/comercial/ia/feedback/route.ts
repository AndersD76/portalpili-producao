import { NextResponse } from 'next/server';
import { registrarFeedback, obterEstatisticas } from '@/lib/comercial/ia';

/**
 * Endpoint para feedback e estatísticas da IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { analise_id, util, comentario } = body;

    if (!analise_id || util === undefined) {
      return NextResponse.json(
        { success: false, error: 'ID da análise e feedback são obrigatórios' },
        { status: 400 }
      );
    }

    await registrarFeedback(analise_id, util, comentario);

    return NextResponse.json({
      success: true,
      message: 'Feedback registrado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao registrar feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao registrar feedback' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodo = parseInt(searchParams.get('periodo') || '30');

    const estatisticas = await obterEstatisticas(periodo);

    return NextResponse.json({
      success: true,
      data: estatisticas,
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao obter estatísticas' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
