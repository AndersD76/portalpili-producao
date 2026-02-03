import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { analisarCausas, buscarNCsSimilares, salvarAnaliseIA } from '@/lib/qualidade/ia';

/**
 * Endpoint para análise de causas de não conformidade via IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nc_id } = body;

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

    // Analisa causas
    const analise = await analisarCausas({
      numero: nc.numero,
      descricao: nc.descricao,
      tipo: nc.tipo,
      gravidade: nc.gravidade,
      local_ocorrencia: nc.local_ocorrencia || nc.unidade_fabricacao,
      setor_responsavel: nc.setor_responsavel || nc.processo_origem,
      produtos_afetados: nc.produtos_afetados || nc.codigo_peca,
      evidencias: nc.evidencia_objetiva || nc.evidencias,
      acao_contencao: nc.acao_contencao || nc.acao_imediata,
    });

    // Busca NCs similares
    const similares = await buscarNCsSimilares({
      descricao: nc.descricao,
      tipo: nc.tipo,
      setor_responsavel: nc.setor_responsavel,
    });

    // Salva análise
    const analiseId = await salvarAnaliseIA(nc_id, 'CAUSAS', {
      analise,
      similares,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: analiseId,
        analise,
        ncs_similares: similares.ncs_similares,
        insights: similares.insights,
      },
    });
  } catch (error: unknown) {
    console.error('Erro na análise de causas:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao analisar causas' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
