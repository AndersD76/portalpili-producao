import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Estatísticas gerais de Não Conformidades
    const ncStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas,
        COUNT(*) FILTER (WHERE status = 'EM_ANALISE') as em_analise,
        COUNT(*) FILTER (WHERE status = 'FECHADA') as fechadas,
        SUM(COALESCE(quantidade_afetada, 0)) as total_itens
      FROM nao_conformidades
    `);

    // NCs por tipo
    const ncPorTipo = await pool.query(`
      SELECT tipo, COUNT(*) as count
      FROM nao_conformidades
      WHERE tipo IS NOT NULL
      GROUP BY tipo
      ORDER BY count DESC
      LIMIT 10
    `);

    // NCs por gravidade
    const ncPorGravidade = await pool.query(`
      SELECT gravidade, COUNT(*) as count
      FROM nao_conformidades
      WHERE gravidade IS NOT NULL
      GROUP BY gravidade
      ORDER BY count DESC
    `);

    // NCs por disposição
    const ncPorDisposicao = await pool.query(`
      SELECT disposicao, COUNT(*) as count
      FROM nao_conformidades
      WHERE disposicao IS NOT NULL
      GROUP BY disposicao
      ORDER BY count DESC
    `);

    // NCs por setor responsável (processo origem)
    const ncPorSetor = await pool.query(`
      SELECT setor_responsavel as setor, COUNT(*) as count
      FROM nao_conformidades
      WHERE setor_responsavel IS NOT NULL AND setor_responsavel != ''
      GROUP BY setor_responsavel
      ORDER BY count DESC
      LIMIT 10
    `);

    // NCs por local (unidade de fabricação)
    const ncPorLocal = await pool.query(`
      SELECT local_ocorrencia as local, COUNT(*) as count
      FROM nao_conformidades
      WHERE local_ocorrencia IS NOT NULL AND local_ocorrencia != ''
      GROUP BY local_ocorrencia
      ORDER BY count DESC
    `);

    // NCs por mês (últimos 12 meses)
    const ncPorMes = await pool.query(`
      SELECT
        TO_CHAR(data_ocorrencia, 'YYYY-MM') as mes,
        COUNT(*) as count
      FROM nao_conformidades
      WHERE data_ocorrencia >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_ocorrencia, 'YYYY-MM')
      ORDER BY mes
    `);

    // Top 10 detectores
    const topDetectores = await pool.query(`
      SELECT detectado_por as responsavel, COUNT(*) as count
      FROM nao_conformidades
      WHERE detectado_por IS NOT NULL AND detectado_por != ''
      GROUP BY detectado_por
      ORDER BY count DESC
      LIMIT 10
    `);

    // NCs por origem (tarefa)
    const ncPorOrigem = await pool.query(`
      SELECT origem, COUNT(*) as count
      FROM nao_conformidades
      WHERE origem IS NOT NULL AND origem != '' AND origem != 'Nenhuma'
      GROUP BY origem
      ORDER BY count DESC
      LIMIT 10
    `);

    // Estatísticas de Reclamações
    const recStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas,
        COUNT(*) FILTER (WHERE status = 'EM_ANALISE') as em_analise,
        COUNT(*) FILTER (WHERE status = 'FECHADA') as fechadas
      FROM reclamacoes_clientes
    `);

    // Estatísticas de Ações Corretivas
    const acStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas,
        COUNT(*) FILTER (WHERE status = 'EM_ANDAMENTO') as em_andamento,
        COUNT(*) FILTER (WHERE status = 'FECHADA') as fechadas,
        COUNT(*) FILTER (WHERE acao_eficaz = true) as eficazes
      FROM acoes_corretivas
    `);

    // NCs recentes
    const ncsRecentes = await pool.query(`
      SELECT id, numero, tipo, gravidade, status, descricao, data_ocorrencia, local_ocorrencia
      FROM nao_conformidades
      ORDER BY created DESC
      LIMIT 10
    `);

    return NextResponse.json({
      success: true,
      data: {
        naoConformidades: {
          stats: ncStats.rows[0],
          porTipo: ncPorTipo.rows,
          porGravidade: ncPorGravidade.rows,
          porDisposicao: ncPorDisposicao.rows,
          porSetor: ncPorSetor.rows,
          porLocal: ncPorLocal.rows,
          porMes: ncPorMes.rows,
          porOrigem: ncPorOrigem.rows,
          topDetectores: topDetectores.rows,
          recentes: ncsRecentes.rows
        },
        reclamacoes: {
          stats: recStats.rows[0]
        },
        acoesCorretivas: {
          stats: acStats.rows[0]
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard de qualidade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar dados do dashboard' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
