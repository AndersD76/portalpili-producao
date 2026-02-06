import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Verificar permissão de visualização
  const auth = await verificarPermissao('QUALIDADE', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filtroLocal = searchParams.get('local');
    const filtroGravidade = searchParams.get('gravidade');
    const filtroStatus = searchParams.get('status');
    const filtroTipo = searchParams.get('tipo');
    const filtroProcesso = searchParams.get('processo');
    const filtroPeriodo = searchParams.get('periodo');

    // Construir cláusulas WHERE para NCs
    const ncWhereConditions: string[] = [];
    const ncParams: any[] = [];
    let ncParamIndex = 1;

    if (filtroLocal && filtroLocal !== 'todos') {
      ncWhereConditions.push(`local_ocorrencia = $${ncParamIndex}`);
      ncParams.push(filtroLocal);
      ncParamIndex++;
    }
    if (filtroGravidade && filtroGravidade !== 'todos') {
      ncWhereConditions.push(`gravidade = $${ncParamIndex}`);
      ncParams.push(filtroGravidade);
      ncParamIndex++;
    }
    if (filtroStatus && filtroStatus !== 'todos') {
      ncWhereConditions.push(`status = $${ncParamIndex}`);
      ncParams.push(filtroStatus);
      ncParamIndex++;
    }
    if (filtroTipo && filtroTipo !== 'todos') {
      ncWhereConditions.push(`tipo = $${ncParamIndex}`);
      ncParams.push(filtroTipo);
      ncParamIndex++;
    }
    if (filtroProcesso && filtroProcesso !== 'todos') {
      ncWhereConditions.push(`setor_responsavel = $${ncParamIndex}`);
      ncParams.push(filtroProcesso);
      ncParamIndex++;
    }
    if (filtroPeriodo && filtroPeriodo !== 'todos') {
      ncWhereConditions.push(`data_ocorrencia >= NOW() - INTERVAL '${parseInt(filtroPeriodo)} days'`);
    }

    const ncWhereClause = ncWhereConditions.length > 0
      ? `WHERE ${ncWhereConditions.join(' AND ')}`
      : '';

    // Estatísticas gerais de Não Conformidades (com filtros)
    const ncStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas,
        COUNT(*) FILTER (WHERE status = 'EM_ANALISE') as em_analise,
        COUNT(*) FILTER (WHERE status = 'FECHADA') as fechadas,
        SUM(COALESCE(quantidade_afetada, 0)) as total_itens
      FROM nao_conformidades
      ${ncWhereClause}
    `, ncParams);

    // NCs por tipo (com filtros)
    const ncPorTipo = await pool.query(`
      SELECT tipo, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} tipo IS NOT NULL
      GROUP BY tipo
      ORDER BY count DESC
      LIMIT 10
    `, ncParams);

    // NCs por gravidade (com filtros)
    const ncPorGravidade = await pool.query(`
      SELECT gravidade, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} gravidade IS NOT NULL
      GROUP BY gravidade
      ORDER BY count DESC
    `, ncParams);

    // NCs por disposição (com filtros)
    const ncPorDisposicao = await pool.query(`
      SELECT disposicao, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} disposicao IS NOT NULL
      GROUP BY disposicao
      ORDER BY count DESC
    `, ncParams);

    // NCs por setor responsável (com filtros)
    const ncPorSetor = await pool.query(`
      SELECT setor_responsavel as setor, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} setor_responsavel IS NOT NULL AND setor_responsavel != ''
      GROUP BY setor_responsavel
      ORDER BY count DESC
      LIMIT 10
    `, ncParams);

    // NCs por local (com filtros)
    const ncPorLocal = await pool.query(`
      SELECT local_ocorrencia as local, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} local_ocorrencia IS NOT NULL AND local_ocorrencia != ''
      GROUP BY local_ocorrencia
      ORDER BY count DESC
    `, ncParams);

    // NCs por mês (últimos 12 meses, com filtros)
    const ncPorMes = await pool.query(`
      SELECT
        TO_CHAR(data_ocorrencia, 'YYYY-MM') as mes,
        COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} data_ocorrencia >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_ocorrencia, 'YYYY-MM')
      ORDER BY mes
    `, ncParams);

    // Top 10 detectores (com filtros)
    const topDetectores = await pool.query(`
      SELECT detectado_por as responsavel, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} detectado_por IS NOT NULL AND detectado_por != ''
      GROUP BY detectado_por
      ORDER BY count DESC
      LIMIT 10
    `, ncParams);

    // NCs por origem (com filtros)
    const ncPorOrigem = await pool.query(`
      SELECT origem, COUNT(*) as count
      FROM nao_conformidades
      ${ncWhereClause ? ncWhereClause + ' AND' : 'WHERE'} origem IS NOT NULL AND origem != '' AND origem != 'Nenhuma'
      GROUP BY origem
      ORDER BY count DESC
      LIMIT 10
    `, ncParams);

    // NCs recentes (com filtros)
    const ncsRecentes = await pool.query(`
      SELECT id, numero, tipo, gravidade, status, descricao, data_ocorrencia, local_ocorrencia
      FROM nao_conformidades
      ${ncWhereClause}
      ORDER BY created DESC
      LIMIT 10
    `, ncParams);

    // ===== RECLAMAÇÕES DE CLIENTES =====
    const recStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas,
        COUNT(*) FILTER (WHERE status = 'EM_ANALISE') as em_analise,
        COUNT(*) FILTER (WHERE status = 'RESPONDIDA') as respondidas,
        COUNT(*) FILTER (WHERE status = 'FECHADA') as fechadas
      FROM reclamacoes_clientes
    `);

    // Reclamações por status
    const recPorStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM reclamacoes_clientes
      GROUP BY status
      ORDER BY count DESC
    `);

    // Reclamações por mês
    const recPorMes = await pool.query(`
      SELECT
        TO_CHAR(data_reclamacao, 'YYYY-MM') as mes,
        COUNT(*) as count
      FROM reclamacoes_clientes
      WHERE data_reclamacao >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_reclamacao, 'YYYY-MM')
      ORDER BY mes
    `);

    // Reclamações por tipo
    const recPorTipoDefeito = await pool.query(`
      SELECT tipo_reclamacao as tipo, COUNT(*) as count
      FROM reclamacoes_clientes
      WHERE tipo_reclamacao IS NOT NULL AND tipo_reclamacao != ''
      GROUP BY tipo_reclamacao
      ORDER BY count DESC
      LIMIT 10
    `);

    // Reclamações recentes
    const recRecentes = await pool.query(`
      SELECT id, numero, cliente_nome, status, descricao, data_reclamacao, tipo_reclamacao
      FROM reclamacoes_clientes
      ORDER BY created DESC
      LIMIT 10
    `);

    // ===== AÇÕES CORRETIVAS =====
    const acStats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas,
        COUNT(*) FILTER (WHERE status = 'EM_ANDAMENTO') as em_andamento,
        COUNT(*) FILTER (WHERE status = 'AGUARDANDO_VERIFICACAO') as aguardando_verificacao,
        COUNT(*) FILTER (WHERE status = 'FECHADA') as fechadas
      FROM acoes_corretivas
    `);

    // Ações por status
    const acPorStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM acoes_corretivas
      GROUP BY status
      ORDER BY count DESC
    `);

    // Ações por mês
    const acPorMes = await pool.query(`
      SELECT
        TO_CHAR(data_abertura, 'YYYY-MM') as mes,
        COUNT(*) as count
      FROM acoes_corretivas
      WHERE data_abertura >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(data_abertura, 'YYYY-MM')
      ORDER BY mes
    `);

    // Ações por origem
    const acPorOrigem = await pool.query(`
      SELECT origem_tipo as origem, COUNT(*) as count
      FROM acoes_corretivas
      WHERE origem_tipo IS NOT NULL
      GROUP BY origem_tipo
      ORDER BY count DESC
    `);

    // Ações recentes
    const acRecentes = await pool.query(`
      SELECT id, numero, responsavel_principal, status, descricao_problema, data_abertura, prazo_conclusao
      FROM acoes_corretivas
      ORDER BY created DESC
      LIMIT 10
    `);

    // Ações com prazo vencido
    const acVencidas = await pool.query(`
      SELECT COUNT(*) as count
      FROM acoes_corretivas
      WHERE prazo_conclusao < NOW() AND status != 'FECHADA'
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
          stats: recStats.rows[0],
          porStatus: recPorStatus.rows,
          porMes: recPorMes.rows,
          porTipoDefeito: recPorTipoDefeito.rows,
          recentes: recRecentes.rows
        },
        acoesCorretivas: {
          stats: acStats.rows[0],
          porStatus: acPorStatus.rows,
          porMes: acPorMes.rows,
          porOrigem: acPorOrigem.rows,
          recentes: acRecentes.rows,
          vencidas: Number(acVencidas.rows[0]?.count || 0)
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
