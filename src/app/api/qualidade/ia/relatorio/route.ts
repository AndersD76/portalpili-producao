import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { gerarRelatorioExecutivo } from '@/lib/qualidade/ia';

/**
 * Endpoint para gerar relatório executivo de qualidade via IA
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data_inicio, data_fim } = body;

    if (!data_inicio || !data_fim) {
      return NextResponse.json(
        { success: false, error: 'Datas de início e fim são obrigatórias' },
        { status: 400 }
      );
    }

    // Busca dados do período
    const totalResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM nao_conformidades
      WHERE data_ocorrencia BETWEEN $1 AND $2
    `, [data_inicio, data_fim]);

    const tiposResult = await pool.query(`
      SELECT tipo, COUNT(*) as quantidade
      FROM nao_conformidades
      WHERE data_ocorrencia BETWEEN $1 AND $2
      GROUP BY tipo
      ORDER BY quantidade DESC
    `, [data_inicio, data_fim]);

    const gravidadeResult = await pool.query(`
      SELECT COALESCE(gravidade, 'NAO_INFORMADA') as gravidade, COUNT(*) as quantidade
      FROM nao_conformidades
      WHERE data_ocorrencia BETWEEN $1 AND $2
      GROUP BY gravidade
      ORDER BY quantidade DESC
    `, [data_inicio, data_fim]);

    const tempoResult = await pool.query(`
      SELECT AVG(
        EXTRACT(EPOCH FROM (
          CASE WHEN status = 'FECHADA' AND closed_at IS NOT NULL
          THEN closed_at - created
          ELSE NULL END
        )) / 86400
      ) as tempo_medio
      FROM nao_conformidades
      WHERE data_ocorrencia BETWEEN $1 AND $2
      AND status = 'FECHADA'
    `, [data_inicio, data_fim]);

    const setoresResult = await pool.query(`
      SELECT COALESCE(setor_responsavel, 'NAO_INFORMADO') as setor, COUNT(*) as quantidade
      FROM nao_conformidades
      WHERE data_ocorrencia BETWEEN $1 AND $2
      GROUP BY setor_responsavel
      ORDER BY quantidade DESC
      LIMIT 10
    `, [data_inicio, data_fim]);

    // Calcula taxa de reincidência (NCs com mesmo tipo/setor)
    const reincidenciaResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE cnt > 1) * 100.0 / NULLIF(COUNT(*), 0) as taxa
      FROM (
        SELECT tipo, setor_responsavel, COUNT(*) as cnt
        FROM nao_conformidades
        WHERE data_ocorrencia BETWEEN $1 AND $2
        GROUP BY tipo, setor_responsavel
      ) sub
    `, [data_inicio, data_fim]);

    const dados = {
      total_ncs: parseInt(totalResult.rows[0]?.total || '0'),
      ncs_por_tipo: tiposResult.rows.map(r => ({
        tipo: r.tipo,
        quantidade: parseInt(r.quantidade)
      })),
      ncs_por_gravidade: gravidadeResult.rows.map(r => ({
        gravidade: r.gravidade,
        quantidade: parseInt(r.quantidade)
      })),
      tempo_medio_resolucao: Math.round(parseFloat(tempoResult.rows[0]?.tempo_medio || '0')),
      taxa_reincidencia: Math.round(parseFloat(reincidenciaResult.rows[0]?.taxa || '0')),
      principais_setores: setoresResult.rows.map(r => ({
        setor: r.setor,
        quantidade: parseInt(r.quantidade)
      })),
    };

    // Gera relatório
    const relatorio = await gerarRelatorioExecutivo(
      { inicio: data_inicio, fim: data_fim },
      dados
    );

    return NextResponse.json({
      success: true,
      data: {
        periodo: { inicio: data_inicio, fim: data_fim },
        estatisticas: dados,
        relatorio,
      },
    });
  } catch (error: unknown) {
    console.error('Erro ao gerar relatório:', error);

    if (error instanceof Error && error.message?.includes('ANTHROPIC_API_KEY')) {
      return NextResponse.json(
        { success: false, error: 'API de IA não configurada. Configure a variável ANTHROPIC_API_KEY.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
