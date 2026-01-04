import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

export async function GET() {
  try {
    // Estatísticas gerais de OPDs
    const opdStatsQuery = `
      SELECT
        COUNT(DISTINCT numero_opd) as total_opds,
        COUNT(*) as total_atividades,
        SUM(CASE WHEN status = 'CONCLUÍDA' THEN 1 ELSE 0 END) as atividades_concluidas,
        SUM(CASE WHEN status = 'EM ANDAMENTO' THEN 1 ELSE 0 END) as atividades_em_andamento,
        SUM(CASE WHEN status = 'A REALIZAR' THEN 1 ELSE 0 END) as atividades_a_realizar,
        ROUND(
          (SUM(CASE WHEN status = 'CONCLUÍDA' THEN 1 ELSE 0 END)::numeric /
          NULLIF(COUNT(*), 0) * 100)::numeric,
          2
        ) as percentual_conclusao
      FROM registros_atividades
    `;

    const opdStatsResult = await pool.query(opdStatsQuery);
    const opdStats = opdStatsResult.rows[0];

    // Estatísticas por atividade com tempo médio calculado
    const atividadeStatsQuery = `
      SELECT
        atividade,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'CONCLUÍDA' THEN 1 ELSE 0 END) as concluidas,
        SUM(CASE WHEN status = 'EM ANDAMENTO' THEN 1 ELSE 0 END) as em_andamento,
        SUM(CASE WHEN status = 'A REALIZAR' THEN 1 ELSE 0 END) as a_realizar,
        AVG(
          CASE
            WHEN status = 'CONCLUÍDA'
              AND data_inicio IS NOT NULL
              AND data_termino IS NOT NULL
            THEN EXTRACT(EPOCH FROM (data_termino::timestamp - data_inicio::timestamp)) / 86400
            ELSE NULL
          END
        ) as tempo_medio_dias
      FROM registros_atividades
      GROUP BY atividade
      ORDER BY
        CASE atividade
          WHEN 'LIBERAÇÃO FINANCEIRA' THEN 1
          WHEN 'CRIAÇÃO DA OPD' THEN 2
          WHEN 'COMPRA DE MATÉRIA PRIMA' THEN 3
          WHEN 'RECEBIMENTO DE MATÉRIA PRIMA' THEN 4
          WHEN 'CORTE' THEN 5
          WHEN 'DOBRA' THEN 6
          WHEN 'USINAGEM' THEN 7
          WHEN 'SOLDAGEM' THEN 8
          WHEN 'JATEAMENTO' THEN 9
          WHEN 'PINTURA' THEN 10
          WHEN 'MONTAGEM MECÂNICA' THEN 11
          WHEN 'MONTAGEM HIDRÁULICA' THEN 12
          WHEN 'MONTAGEM ELÉTRICA' THEN 13
          WHEN 'TESTES' THEN 14
          WHEN 'EMBALAGEM' THEN 15
          WHEN 'PRODUÇÃO' THEN 16
          WHEN 'EXPEDIÇÃO' THEN 17
          WHEN 'LIBERAÇÃO E EMBARQUE' THEN 18
          WHEN 'PREPARAÇÃO' THEN 19
          WHEN 'DESEMBARQUE E PRÉ-INSTALAÇÃO' THEN 20
          WHEN 'ENTREGA' THEN 21
          ELSE 999
        END
    `;

    const atividadeStatsResult = await pool.query(atividadeStatsQuery);
    const atividadeStats = atividadeStatsResult.rows;

    return NextResponse.json({
      success: true,
      data: {
        opdStats: {
          total_opds: parseInt(opdStats.total_opds),
          total_atividades: parseInt(opdStats.total_atividades),
          atividades_concluidas: parseInt(opdStats.atividades_concluidas),
          atividades_em_andamento: parseInt(opdStats.atividades_em_andamento),
          atividades_a_realizar: parseInt(opdStats.atividades_a_realizar),
          percentual_conclusao: parseFloat(opdStats.percentual_conclusao) || 0,
        },
        atividadeStats: atividadeStats.map((stat) => ({
          atividade: stat.atividade,
          total: parseInt(stat.total),
          concluidas: parseInt(stat.concluidas),
          em_andamento: parseInt(stat.em_andamento),
          a_realizar: parseInt(stat.a_realizar),
          tempo_medio_dias: stat.tempo_medio_dias ? parseFloat(stat.tempo_medio_dias) : null,
        })),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro ao buscar dados do dashboard',
      },
      { status: 500 }
    );
  }
}
