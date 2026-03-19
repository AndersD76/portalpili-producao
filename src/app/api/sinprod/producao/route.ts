import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SINPROD_API_URL = process.env.SINPROD_API_URL;
const SINPROD_API_KEY = process.env.SINPROD_API_KEY || 'pili-sinprod-2026';

async function sinprodQuery(sql: string) {
  if (!SINPROD_API_URL) throw new Error('SINPROD_API_URL não configurado');
  const res = await fetch(`${SINPROD_API_URL}/api/query`, {
    method: 'POST',
    headers: { 'X-API-Key': SINPROD_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export async function GET(request: Request) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { searchParams } = new URL(request.url);
  const de = searchParams.get('de') || '';
  const ate = searchParams.get('ate') || '';

  // Build date filter
  let dateFilter: string;
  if (de && ate) {
    dateFilter = `t.DT_LEITURA_INI >= '${de}' AND t.DT_LEITURA_INI <= '${ate} 23:59:59'`;
  } else {
    const periodo = parseInt(searchParams.get('dias') || '30');
    dateFilter = `t.DT_LEITURA_INI >= DATEADD(-${Math.min(Math.max(periodo, 1), 365)} DAY TO CURRENT_DATE)`;
  }

  try {
    const [
      opdsPorStatus,
      opdsEmProducao,
      apontamentosAbertos,
      operadores30d,
      recursos30d,
      processos30d,
      tempoRecente,
    ] = await Promise.all([
      sinprodQuery(`SELECT COUNT(*) as TOTAL, STATUS FROM CADOPD GROUP BY STATUS`).catch(() => []),

      sinprodQuery(`
        SELECT FIRST 50 o.NUMOPD, o.STATUS, o.COD_CLIENTE, o.DATA_FINAL_PREV, o.DATA_INICIO, o.PRIORIDADE,
          c.NOME as CLIENTE_NOME
        FROM CADOPD o LEFT JOIN CLIENTES c ON o.COD_CLIENTE = c.CODIGO
        WHERE (o.STATUS LIKE 'Em Produ%' OR o.STATUS = 'Paralisada')
        ORDER BY o.PRIORIDADE DESC, o.DATA_FINAL_PREV ASC
      `).catch(() => []),

      sinprodQuery(`
        SELECT v.DATA_HORA_INICIO, v.ORDEM_FABRICACAO, v.RECURSO, v.ESTAGIO_INICIO, v.FUNCIONARIO_INICIO,
          f.NOME_FUN as NOME_FUNCIONARIO
        FROM vw_pili_maq_apontamentos v LEFT JOIN FUNCI f ON v.FUNCIONARIO_INICIO = f.CODIGO_FUN
        ORDER BY v.DATA_HORA_INICIO DESC
      `).catch(() => []),

      // Operadores últimos 30 dias: quem abriu, quem fechou, quantos
      sinprodQuery(`
        SELECT f.NOME_FUN as OPERADOR, COUNT(*) as TOTAL,
          SUM(CASE WHEN t.DT_LEITURA_FIM IS NULL THEN 1 ELSE 0 END) as ABERTOS,
          SUM(CASE WHEN t.DT_LEITURA_FIM IS NOT NULL THEN 1 ELSE 0 END) as FECHADOS,
          SUM(COALESCE(t.QTDE_PRODUZIDA, 0)) as PECAS,
          SUM(COALESCE(t.QTDE_REFUGADA, 0)) as REFUGO
        FROM TEMPOS_PRODUCAO_LEITORES t LEFT JOIN FUNCI f ON t.CD_FUNCIONARIO_INI = f.CODIGO_FUN
        WHERE ${dateFilter}
          AND (t.FL_CANCELADO IS NULL OR t.FL_CANCELADO = '0')
        GROUP BY f.NOME_FUN ORDER BY COUNT(*) DESC
      `).catch(() => []),

      // Recursos últimos 30 dias: tempo ativo com nome do patrimônio
      sinprodQuery(`
        SELECT t.CD_RECURSO, COUNT(*) as TOTAL,
          SUM(CASE WHEN t.DT_LEITURA_FIM IS NULL THEN 1 ELSE 0 END) as ATIVOS,
          gp.DESCRICAO as NOME_RECURSO
        FROM TEMPOS_PRODUCAO_LEITORES t
        LEFT JOIN GERAL_PATRIMONIO gp ON t.CD_RECURSO = gp.CODIGO
        WHERE ${dateFilter}
          AND t.CD_RECURSO IS NOT NULL AND t.CD_RECURSO <> ''
        GROUP BY t.CD_RECURSO, gp.DESCRICAO ORDER BY COUNT(*) DESC
      `).catch(() => []),

      // Processos últimos 30 dias COM NOME
      sinprodQuery(`
        SELECT t.CD_PROCESSO as PROCESSO, p.NOME as NOME_PROCESSO, COUNT(*) as TOTAL,
          SUM(CASE WHEN t.DT_LEITURA_FIM IS NULL THEN 1 ELSE 0 END) as ABERTOS,
          SUM(CASE WHEN t.DT_LEITURA_FIM IS NOT NULL THEN 1 ELSE 0 END) as FECHADOS
        FROM TEMPOS_PRODUCAO_LEITORES t
        LEFT JOIN PROCESSOS p ON t.CD_PROCESSO = p.CODIGO
        WHERE ${dateFilter}
          AND (t.FL_CANCELADO IS NULL OR t.FL_CANCELADO = '0')
        GROUP BY t.CD_PROCESSO, p.NOME ORDER BY COUNT(*) DESC
      `).catch(() => []),

      // Últimos 20 apontamentos (abertos e fechados) com detalhes
      sinprodQuery(`
        SELECT FIRST 20 t.DT_LEITURA_INI, t.DT_LEITURA_FIM,
          t.CD_FUNCIONARIO_INI, t.CD_FUNCIONARIO_FIM,
          f1.NOME_FUN as NOME_ABRIU, f2.NOME_FUN as NOME_FECHOU,
          t.CD_RECURSO, t.ORDEM_FABRICACAO, t.CD_PROCESSO, t.HORAS_COMPUTADAS,
          t.QTDE_PRODUZIDA, t.QTDE_REFUGADA, t.CD_PARADA
        FROM TEMPOS_PRODUCAO_LEITORES t
        LEFT JOIN FUNCI f1 ON t.CD_FUNCIONARIO_INI = f1.CODIGO_FUN
        LEFT JOIN FUNCI f2 ON t.CD_FUNCIONARIO_FIM = f2.CODIGO_FUN
        WHERE ${dateFilter}
          AND (t.FL_CANCELADO IS NULL OR t.FL_CANCELADO = '0')
        ORDER BY t.DT_LEITURA_INI DESC
      `).catch(() => []),
    ]);

    // Stats
    const statusMap: Record<string, number> = {};
    for (const row of opdsPorStatus) statusMap[row.STATUS] = row.TOTAL;

    // Quem está trabalhando agora (apontamentos abertos)
    const trabalhando = apontamentosAbertos.map((a: Record<string, unknown>) => ({
      nome: a.NOME_FUNCIONARIO || `Func. ${a.FUNCIONARIO_INICIO}`,
      recurso: a.RECURSO || null,
      of: a.ORDEM_FABRICACAO || null,
      estagio: a.ESTAGIO_INICIO,
      inicio: a.DATA_HORA_INICIO,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total_opds: Object.values(statusMap).reduce((a, b) => a + b, 0),
          em_producao: statusMap['Em Produção'] || 0,
          paralisadas: statusMap['Paralisada'] || 0,
          concluidas: statusMap['Concluída'] || 0,
          faturadas: (statusMap['Faturada'] || 0) + (statusMap['Entregue'] || 0),
          trabalhando_agora: trabalhando.length,
          total_operadores_30d: operadores30d.length,
        },
        charts: {
          opds_por_status: opdsPorStatus.map((r: Record<string, unknown>) => ({
            label: r.STATUS as string, value: r.TOTAL as number,
          })),
          operadores_30d: operadores30d,
          recursos_30d: recursos30d,
          processos_30d: processos30d,
        },
        trabalhando_agora: trabalhando,
        opds_em_producao: opdsEmProducao,
        tempo_recente: tempoRecente,
      },
    });
  } catch (error) {
    console.error('[SINPROD] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao consultar SINPROD',
    }, { status: 500 });
  }
}
