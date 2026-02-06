import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { ATIVIDADES_PADRAO, SUBTAREFAS_PRODUCAO_TOMBADOR, SUBTAREFAS_PRODUCAO_COLETOR } from '@/lib/atividadesPadrao';
import { verificarPermissao } from '@/lib/auth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

// Criar mapa de ordem para todas as atividades
function getOrdemAtividade(atividade: string): number {
  // Atividades principais
  const atividadePadrao = ATIVIDADES_PADRAO.find(a => a.atividade === atividade);
  if (atividadePadrao) return atividadePadrao.ordem;

  // Subtarefas TOMBADOR (ordem após PRODUÇÃO = 17, então 17.1, 17.2, etc.)
  const subtarefaTombador = SUBTAREFAS_PRODUCAO_TOMBADOR.find(a => a.atividade === atividade);
  if (subtarefaTombador) return 17 + (subtarefaTombador.ordem * 0.01);

  // Subtarefas COLETOR
  const subtarefaColetor = SUBTAREFAS_PRODUCAO_COLETOR.find(a => a.atividade === atividade);
  if (subtarefaColetor) return 17 + (subtarefaColetor.ordem * 0.01);

  return 999;
}

export async function GET(request: NextRequest) {
  // Verificar permissão de visualização
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filtroOPD = searchParams.get('opd');
    const filtroProduto = searchParams.get('produto');
    const filtroAtividade = searchParams.get('atividade');

    // Construir cláusulas WHERE baseadas nos filtros
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filtroOPD) {
      whereConditions.push(`ra.numero_opd = $${paramIndex}`);
      params.push(filtroOPD);
      paramIndex++;
    }

    if (filtroProduto) {
      whereConditions.push(`o.tipo_produto = $${paramIndex}`);
      params.push(filtroProduto);
      paramIndex++;
    }

    if (filtroAtividade) {
      whereConditions.push(`ra.atividade = $${paramIndex}`);
      params.push(filtroAtividade);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Estatísticas gerais
    const opdStatsQuery = `
      SELECT
        COUNT(DISTINCT ra.numero_opd) as total_opds,
        COUNT(*) as total_atividades,
        SUM(CASE WHEN ra.status = 'CONCLUÍDA' THEN 1 ELSE 0 END) as atividades_concluidas,
        SUM(CASE WHEN ra.status = 'EM ANDAMENTO' THEN 1 ELSE 0 END) as atividades_em_andamento,
        SUM(CASE WHEN ra.status = 'A REALIZAR' THEN 1 ELSE 0 END) as atividades_a_realizar,
        ROUND(
          (SUM(CASE WHEN ra.status = 'CONCLUÍDA' THEN 1 ELSE 0 END)::numeric /
          NULLIF(COUNT(*), 0) * 100)::numeric,
          2
        ) as percentual_conclusao
      FROM registros_atividades ra
      LEFT JOIN opds o ON ra.numero_opd = o.numero
      ${whereClause}
    `;

    const opdStatsResult = await pool.query(opdStatsQuery, params);
    const opdStats = opdStatsResult.rows[0];

    // Estatísticas por atividade com tempo médio em MINUTOS
    const atividadeStatsQuery = `
      SELECT
        ra.atividade,
        COUNT(*) as total,
        SUM(CASE WHEN ra.status = 'CONCLUÍDA' THEN 1 ELSE 0 END) as concluidas,
        SUM(CASE WHEN ra.status = 'EM ANDAMENTO' THEN 1 ELSE 0 END) as em_andamento,
        SUM(CASE WHEN ra.status = 'A REALIZAR' THEN 1 ELSE 0 END) as a_realizar,
        AVG(
          CASE
            WHEN ra.status = 'CONCLUÍDA'
              AND ra.data_inicio IS NOT NULL
              AND ra.data_termino IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ra.data_termino::timestamp - ra.data_inicio::timestamp)) / 60
            ELSE NULL
          END
        ) as tempo_medio_minutos
      FROM registros_atividades ra
      LEFT JOIN opds o ON ra.numero_opd = o.numero
      ${whereClause}
      GROUP BY ra.atividade
    `;

    const atividadeStatsResult = await pool.query(atividadeStatsQuery, params);
    const atividadeStats = atividadeStatsResult.rows
      .map((stat) => ({
        atividade: stat.atividade,
        total: parseInt(stat.total),
        concluidas: parseInt(stat.concluidas),
        em_andamento: parseInt(stat.em_andamento),
        a_realizar: parseInt(stat.a_realizar),
        tempo_medio_minutos: stat.tempo_medio_minutos ? parseFloat(stat.tempo_medio_minutos) : null,
        ordem: getOrdemAtividade(stat.atividade),
      }))
      .sort((a, b) => a.ordem - b.ordem);

    // Buscar lista de OPDs para filtro
    const opdsQuery = `SELECT DISTINCT numero FROM opds ORDER BY numero DESC LIMIT 100`;
    const opdsResult = await pool.query(opdsQuery);
    const opds = opdsResult.rows.map(r => r.numero);

    // Buscar lista de atividades únicas para filtro
    const atividadesQuery = `SELECT DISTINCT atividade FROM registros_atividades ORDER BY atividade`;
    const atividadesResult = await pool.query(atividadesQuery);
    const atividades = atividadesResult.rows.map(r => r.atividade);

    return NextResponse.json({
      success: true,
      data: {
        opdStats: {
          total_opds: parseInt(opdStats.total_opds) || 0,
          total_atividades: parseInt(opdStats.total_atividades) || 0,
          atividades_concluidas: parseInt(opdStats.atividades_concluidas) || 0,
          atividades_em_andamento: parseInt(opdStats.atividades_em_andamento) || 0,
          atividades_a_realizar: parseInt(opdStats.atividades_a_realizar) || 0,
          percentual_conclusao: parseFloat(opdStats.percentual_conclusao) || 0,
        },
        atividadeStats,
        filtros: {
          opds,
          atividades,
          produtos: ['TOMBADOR', 'COLETOR'],
        },
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
