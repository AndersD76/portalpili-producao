import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SINPROD_API_URL = process.env.SINPROD_API_URL;
const SINPROD_API_KEY = process.env.SINPROD_API_KEY || 'pili-sinprod-2026';

async function sinprodQuery(sql: string) {
  if (!SINPROD_API_URL) throw new Error('SINPROD_API_URL não configurado');

  const res = await fetch(`${SINPROD_API_URL}/api/query`, {
    method: 'POST',
    headers: {
      'X-API-Key': SINPROD_API_KEY,
      'Content-Type': 'application/json',
    },
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

  try {
    const [
      opdsPorStatus,
      opdsEmProducao,
      apontamentosAbertos,
      recursos,
      apontPorOperador,
      apontPorRecurso,
      apontPorEstagio,
      producaoRecente,
    ] = await Promise.all([
      sinprodQuery(`SELECT COUNT(*) as TOTAL, STATUS FROM CADOPD GROUP BY STATUS`).catch(() => []),

      sinprodQuery(`
        SELECT FIRST 50 o.CODIGO, o.NUMOPD, o.STATUS, o.COD_CLIENTE,
          o.DATA_PEDIDO, o.DATA_FINAL_PREV, o.DATA_INICIO, o.PRIORIDADE,
          c.NOME as CLIENTE_NOME
        FROM CADOPD o
        LEFT JOIN CLIENTES c ON o.COD_CLIENTE = c.CODIGO
        WHERE o.STATUS IN ('Em Produção', 'Paralisada')
        ORDER BY o.PRIORIDADE DESC, o.DATA_FINAL_PREV ASC
      `).catch(() => []),

      sinprodQuery(`
        SELECT v.DATA_HORA_INICIO, v.ORDEM_FABRICACAO, v.RECURSO,
          v.ESTAGIO_INICIO, v.FUNCIONARIO_INICIO,
          f.NOME_FUN as NOME_FUNCIONARIO
        FROM vw_pili_maq_apontamentos v
        LEFT JOIN FUNCI f ON v.FUNCIONARIO_INICIO = f.CODIGO_FUN
        ORDER BY v.DATA_HORA_INICIO DESC
      `).catch(() => []),

      sinprodQuery(`
        SELECT r.CODIGO, r.DESCRICAO, r.TIPO, cp.DESCRICAO as CENTRO
        FROM CENTROS_PRODUCAO_RECURSOS r
        LEFT JOIN CENTROS_PRODUCAO cp ON r.COD_CENTRO = cp.CODIGO
        ORDER BY r.DESCRICAO
      `).catch(() => []),

      // Apontamentos abertos por operador (quem mais tem abertos)
      sinprodQuery(`
        SELECT f.NOME_FUN as OPERADOR, COUNT(*) as TOTAL
        FROM vw_pili_maq_apontamentos v
        LEFT JOIN FUNCI f ON v.FUNCIONARIO_INICIO = f.CODIGO_FUN
        GROUP BY f.NOME_FUN
        ORDER BY COUNT(*) DESC
      `).catch(() => []),

      // Apontamentos por recurso (máquina mais utilizada)
      sinprodQuery(`
        SELECT v.RECURSO, COUNT(*) as TOTAL
        FROM vw_pili_maq_apontamentos v
        WHERE v.RECURSO IS NOT NULL
        GROUP BY v.RECURSO
        ORDER BY COUNT(*) DESC
      `).catch(() => []),

      // Apontamentos por estágio/processo
      sinprodQuery(`
        SELECT v.ESTAGIO_INICIO as ESTAGIO, COUNT(*) as TOTAL
        FROM vw_pili_maq_apontamentos v
        GROUP BY v.ESTAGIO_INICIO
        ORDER BY COUNT(*) DESC
      `).catch(() => []),

      // Produção recente (últimos 30 dias - apontamentos fechados)
      sinprodQuery(`
        SELECT FIRST 200 t.CD_FUNCIONARIO, f.NOME_FUN, t.CD_RECURSO,
          t.CD_PROCESSO, t.CD_SETOR, t.HORAS_COMPUTADAS,
          t.QTDE_PRODUZIDA, t.QTDE_REFUGADA, t.DATA_INICIO
        FROM TEMPOS_PRODUCAO_LEITORES t
        LEFT JOIN FUNCI f ON t.CD_FUNCIONARIO = f.CODIGO_FUN
        WHERE t.DATA_INICIO >= DATEADD(-30 DAY TO CURRENT_DATE)
        ORDER BY t.CODIGO DESC
      `).catch(() => []),
    ]);

    // Calcular stats
    const statusMap: Record<string, number> = {};
    for (const row of opdsPorStatus) {
      statusMap[row.STATUS] = row.TOTAL;
    }

    const emProducao = statusMap['Em Produção'] || 0;
    const paralisadas = statusMap['Paralisada'] || 0;
    const concluidas = statusMap['Concluída'] || 0;
    const faturadas = statusMap['Faturada'] || 0;
    const entregues = statusMap['Entregue'] || 0;
    const canceladas = statusMap['Cancelada'] || 0;
    const totalOpds = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Agregar produção recente por operador
    const prodPorOperador: Record<string, { horas: number; pecas: number; refugo: number }> = {};
    for (const r of producaoRecente) {
      const nome = r.NOME_FUN || r.CD_FUNCIONARIO || 'Desconhecido';
      if (!prodPorOperador[nome]) prodPorOperador[nome] = { horas: 0, pecas: 0, refugo: 0 };
      prodPorOperador[nome].horas += Number(r.HORAS_COMPUTADAS) || 0;
      prodPorOperador[nome].pecas += Number(r.QTDE_PRODUZIDA) || 0;
      prodPorOperador[nome].refugo += Number(r.QTDE_REFUGADA) || 0;
    }

    const topOperadores = Object.entries(prodPorOperador)
      .map(([nome, data]) => ({ nome, ...data }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total: totalOpds,
          em_producao: emProducao,
          paralisadas,
          concluidas,
          faturadas,
          entregues,
          canceladas,
          apontamentos_abertos: apontamentosAbertos.length,
          recursos: recursos.length,
        },
        charts: {
          opds_por_status: opdsPorStatus.map((r: Record<string, unknown>) => ({
            label: r.STATUS as string,
            value: r.TOTAL as number,
          })),
          por_operador: apontPorOperador.map((r: Record<string, unknown>) => ({
            label: (r.OPERADOR as string) || 'Sem nome',
            value: r.TOTAL as number,
          })),
          por_recurso: apontPorRecurso.map((r: Record<string, unknown>) => ({
            label: r.RECURSO as string,
            value: r.TOTAL as number,
          })),
          por_estagio: apontPorEstagio.map((r: Record<string, unknown>) => ({
            label: `Estágio ${r.ESTAGIO}`,
            value: r.TOTAL as number,
          })),
          producao_operadores: topOperadores,
        },
        opds_em_producao: opdsEmProducao,
        apontamentos_abertos: apontamentosAbertos,
        recursos,
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
