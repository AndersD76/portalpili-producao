import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || 'totais';
    const dataInicio = searchParams.get('data_inicio');
    const dataFim = searchParams.get('data_fim');
    const usuarioId = searchParams.get('usuario_id');

    // Se usuario_id passado, buscar vendedor_id correspondente
    let vendedorIdFilter: number | null = null;
    if (usuarioId) {
      const vRes = await query('SELECT id FROM crm_vendedores WHERE usuario_id = $1', [usuarioId]);
      if (vRes?.rows?.length) vendedorIdFilter = vRes.rows[0].id;
    }

    // Build date filter clause
    let dateFilter = '';
    const dateParams: unknown[] = [];
    let paramIdx = 1;

    if (dataInicio) {
      dateFilter += ` AND o.created_at >= $${paramIdx++}`;
      dateParams.push(dataInicio);
    }
    if (dataFim) {
      dateFilter += ` AND o.created_at <= $${paramIdx++}::date + interval '1 day'`;
      dateParams.push(dataFim);
    }

    let vendedorFilter = '';
    if (vendedorIdFilter) {
      vendedorFilter = ` AND o.vendedor_id = $${paramIdx++}`;
      dateParams.push(vendedorIdFilter);
    }

    const baseWhere = `WHERE 1=1${dateFilter}${vendedorFilter}`;

    if (tipo === 'totais') {
      // Pipeline por estágio
      const pipelineRes = await query(`
        SELECT
          o.estagio,
          COUNT(*) as quantidade,
          COALESCE(SUM(o.valor_estimado), 0) as valor_total,
          ROUND(AVG(o.probabilidade), 0) as prob_media
        FROM crm_oportunidades o
        ${baseWhere}
        GROUP BY o.estagio
        ORDER BY CASE o.estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
          WHEN 'PERDIDA' THEN 7
          WHEN 'SUSPENSO' THEN 8
          WHEN 'SUBSTITUIDO' THEN 9
          WHEN 'TESTE' THEN 10
        END
      `, dateParams);

      // KPIs gerais
      const kpiRes = await query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN o.status = 'ABERTA' THEN 1 END) as abertas,
          COUNT(CASE WHEN o.estagio = 'FECHADA' THEN 1 END) as ganhas,
          COUNT(CASE WHEN o.estagio = 'PERDIDA' THEN 1 END) as perdidas,
          COALESCE(SUM(CASE WHEN o.status = 'ABERTA' THEN o.valor_estimado END), 0) as valor_abertas,
          COALESCE(SUM(CASE WHEN o.estagio = 'FECHADA' THEN o.valor_estimado END), 0) as valor_ganho,
          COALESCE(AVG(CASE WHEN o.estagio = 'FECHADA' THEN o.valor_estimado END), 0) as ticket_medio
        FROM crm_oportunidades o
        ${baseWhere}
      `, dateParams);

      // Propostas por situação
      const propDateFilter = dateFilter.replace(/o\./g, 'p.');
      const propVendedorFilter = vendedorFilter.replace(/o\./g, 'p.');
      const propWhere = `WHERE 1=1${propDateFilter}${propVendedorFilter}`;
      const propostasRes = await query(`
        SELECT
          p.situacao,
          COUNT(*) as quantidade,
          COALESCE(SUM(p.valor_total), 0) as valor_total
        FROM propostas_comerciais p
        ${propWhere}
        GROUP BY p.situacao
        ORDER BY COUNT(*) DESC
      `, dateParams);

      // Total clientes
      const clientesDateFilter = dateFilter.replace(/o\./g, 'c.');
      const clientesVendedorFilter = vendedorFilter.replace(/o\./g, 'c.');
      const clientesWhere = `WHERE 1=1${clientesDateFilter}${clientesVendedorFilter}`;
      const clientesRes = await query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN c.status = 'ATIVO' THEN 1 END) as ativos
        FROM crm_clientes c
        ${clientesWhere}
      `, dateParams);

      const kpi = kpiRes?.rows[0] || {};
      const ganhas = parseInt(kpi.ganhas || '0');
      const perdidas = parseInt(kpi.perdidas || '0');
      const totalDecididas = ganhas + perdidas;

      return NextResponse.json({
        success: true,
        data: {
          pipeline: pipelineRes?.rows || [],
          kpis: {
            total: parseInt(kpi.total || '0'),
            abertas: parseInt(kpi.abertas || '0'),
            ganhas,
            perdidas,
            valor_abertas: parseFloat(kpi.valor_abertas || '0'),
            valor_ganho: parseFloat(kpi.valor_ganho || '0'),
            ticket_medio: parseFloat(kpi.ticket_medio || '0'),
            taxa_conversao: totalDecididas > 0 ? ((ganhas / totalDecididas) * 100) : 0,
          },
          propostas: propostasRes?.rows || [],
          clientes: clientesRes?.rows[0] || { total: 0, ativos: 0 },
        },
      });
    }

    if (tipo === 'vendedores') {
      const vendedoresRes = await query(`
        SELECT
          v.id,
          v.nome,
          v.tipo,
          v.comissao_padrao,
          COUNT(DISTINCT o.id) as total_oportunidades,
          COUNT(DISTINCT CASE WHEN o.estagio = 'FECHADA' THEN o.id END) as ganhas,
          COUNT(DISTINCT CASE WHEN o.estagio = 'PERDIDA' THEN o.id END) as perdidas,
          COALESCE(SUM(CASE WHEN o.estagio = 'FECHADA' THEN o.valor_estimado END), 0) as valor_ganho,
          COALESCE(SUM(CASE WHEN o.status = 'ABERTA' THEN o.valor_estimado END), 0) as valor_aberto,
          COUNT(DISTINCT c.id) as total_clientes
        FROM crm_vendedores v
        LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id ${dateFilter.replace('AND', 'AND')}
        LEFT JOIN crm_clientes c ON v.id = c.vendedor_id
        WHERE v.ativo = true ${vendedorIdFilter ? `AND v.id = $${paramIdx}` : ''}
        GROUP BY v.id, v.nome, v.tipo, v.comissao_padrao
        ORDER BY valor_ganho DESC
      `, vendedorIdFilter ? [...dateParams, vendedorIdFilter] : dateParams);

      // Propostas por vendedor
      const propostasVendRes = await query(`
        SELECT
          p.vendedor_nome,
          COUNT(*) as total_propostas,
          COUNT(CASE WHEN p.situacao IN ('APROVADA', 'FECHADA') THEN 1 END) as aprovadas,
          COALESCE(SUM(p.valor_total), 0) as valor_total
        FROM propostas_comerciais p
        WHERE p.vendedor_nome IS NOT NULL
          ${dataInicio ? `AND p.created_at >= $${1}` : ''}
          ${dataFim ? `AND p.created_at <= $${dataInicio ? 2 : 1}::date + interval '1 day'` : ''}
        GROUP BY p.vendedor_nome
        ORDER BY valor_total DESC
      `, dateParams.slice(0, (dataInicio ? 1 : 0) + (dataFim ? 1 : 0)));

      return NextResponse.json({
        success: true,
        data: {
          vendedores: vendedoresRes?.rows || [],
          propostas_vendedor: propostasVendRes?.rows || [],
        },
      });
    }

    if (tipo === 'produtos') {
      const produtosRes = await query(`
        SELECT
          COALESCE(o.produto, o.tipo_produto, 'N/D') as produto,
          COUNT(*) as total,
          COUNT(CASE WHEN o.status = 'ABERTA' THEN 1 END) as abertas,
          COUNT(CASE WHEN o.estagio = 'FECHADA' THEN 1 END) as ganhas,
          COUNT(CASE WHEN o.estagio = 'PERDIDA' THEN 1 END) as perdidas,
          COALESCE(SUM(o.valor_estimado), 0) as valor_total,
          COALESCE(SUM(CASE WHEN o.estagio = 'FECHADA' THEN o.valor_estimado END), 0) as valor_ganho,
          COALESCE(AVG(o.valor_estimado), 0) as valor_medio
        FROM crm_oportunidades o
        ${baseWhere}
        GROUP BY COALESCE(o.produto, o.tipo_produto, 'N/D')
        ORDER BY valor_total DESC
      `, dateParams);

      // Pipeline por produto
      const pipelineProdRes = await query(`
        SELECT
          COALESCE(o.produto, o.tipo_produto, 'N/D') as produto,
          o.estagio,
          COUNT(*) as quantidade,
          COALESCE(SUM(o.valor_estimado), 0) as valor_total
        FROM crm_oportunidades o
        ${baseWhere}
        GROUP BY COALESCE(o.produto, o.tipo_produto, 'N/D'), o.estagio
        ORDER BY produto, CASE o.estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
          WHEN 'PERDIDA' THEN 7
          ELSE 8
        END
      `, dateParams);

      // Propostas por produto
      const propostasProdRes = await query(`
        SELECT
          COALESCE(p.tipo_produto, 'N/D') as produto,
          COUNT(*) as total_propostas,
          COUNT(CASE WHEN p.situacao IN ('APROVADA', 'FECHADA') THEN 1 END) as aprovadas,
          COALESCE(SUM(p.valor_total), 0) as valor_total
        FROM propostas_comerciais p
        WHERE 1=1
          ${dataInicio ? `AND p.created_at >= $${1}` : ''}
          ${dataFim ? `AND p.created_at <= $${dataInicio ? 2 : 1}::date + interval '1 day'` : ''}
        GROUP BY COALESCE(p.tipo_produto, 'N/D')
        ORDER BY valor_total DESC
      `, dateParams.slice(0, (dataInicio ? 1 : 0) + (dataFim ? 1 : 0)));

      return NextResponse.json({
        success: true,
        data: {
          produtos: produtosRes?.rows || [],
          pipeline_produto: pipelineProdRes?.rows || [],
          propostas_produto: propostasProdRes?.rows || [],
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Tipo de relatório inválido. Use: totais, vendedores, produtos' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
