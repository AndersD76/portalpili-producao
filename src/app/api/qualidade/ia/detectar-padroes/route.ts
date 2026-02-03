import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { detectarPadroes } from '@/lib/qualidade/ia';

/**
 * Endpoint para detecção de padrões em não conformidades via IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { periodo_dias = 90, tipo, setor } = body;

    // Busca NCs do período
    let sql = `
      SELECT
        numero,
        descricao,
        tipo,
        setor_responsavel,
        local_ocorrencia,
        data_ocorrencia,
        status
      FROM nao_conformidades
      WHERE created >= NOW() - INTERVAL '${periodo_dias} days'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (tipo) {
      sql += ` AND tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    if (setor) {
      sql += ` AND setor_responsavel = $${paramIndex++}`;
      params.push(setor);
    }

    sql += ' ORDER BY created DESC LIMIT 100';

    const result = await pool.query(sql, params);

    if (result.rows.length < 3) {
      return NextResponse.json({
        success: true,
        data: {
          padroes_identificados: [],
          tendencias: ['Dados insuficientes para análise de padrões'],
          areas_criticas: [],
          recomendacoes_sistemicas: [],
          alertas: [`Apenas ${result.rows.length} NC(s) encontrada(s) no período. Necessário mais dados para análise.`],
        },
      });
    }

    // Detecta padrões
    const padroes = await detectarPadroes(result.rows);

    return NextResponse.json({
      success: true,
      data: {
        periodo_analisado: `${periodo_dias} dias`,
        total_ncs_analisadas: result.rows.length,
        ...padroes,
      },
    });
  } catch (error: unknown) {
    console.error('Erro ao detectar padrões:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao detectar padrões' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
