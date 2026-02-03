import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sugerirAcoesCorretivas, salvarAnaliseIA } from '@/lib/qualidade/ia';

/**
 * Endpoint para sugestão de ações corretivas via IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nc_id, causa_raiz, causas_contribuintes } = body;

    if (!nc_id) {
      return NextResponse.json(
        { success: false, error: 'ID da não conformidade é obrigatório' },
        { status: 400 }
      );
    }

    // Busca a NC
    const ncResult = await pool.query(
      'SELECT * FROM nao_conformidades WHERE id = $1',
      [nc_id]
    );

    if (!ncResult.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Não conformidade não encontrada' },
        { status: 404 }
      );
    }

    const nc = ncResult.rows[0];

    // Sugere ações
    const sugestoes = await sugerirAcoesCorretivas(
      {
        numero: nc.numero,
        descricao: nc.descricao,
        tipo: nc.tipo,
        gravidade: nc.gravidade,
        causa_raiz,
      },
      {
        causa_raiz,
        causas_contribuintes,
      }
    );

    // Salva análise
    const analiseId = await salvarAnaliseIA(nc_id, 'ACOES', sugestoes);

    return NextResponse.json({
      success: true,
      data: {
        id: analiseId,
        ...sugestoes,
      },
    });
  } catch (error: unknown) {
    console.error('Erro ao sugerir ações:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao sugerir ações corretivas' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
