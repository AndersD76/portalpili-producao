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
    ] = await Promise.all([
      // Contagem de OPDs por status
      sinprodQuery(`
        SELECT COUNT(*) as TOTAL, STATUS FROM CADOPD GROUP BY STATUS
      `).catch(() => []),

      // OPDs em produção com cliente
      sinprodQuery(`
        SELECT FIRST 50 o.CODIGO, o.NUMOPD, o.STATUS, o.COD_CLIENTE,
          o.DATA_PEDIDO, o.DATA_FINAL_PREV, o.DATA_INICIO, o.PRIORIDADE,
          c.NOME as CLIENTE_NOME
        FROM CADOPD o
        LEFT JOIN CLIENTES c ON o.COD_CLIENTE = c.CODIGO
        WHERE o.STATUS IN ('Em Produção', 'Paralisada')
        ORDER BY o.PRIORIDADE DESC, o.DATA_FINAL_PREV ASC
      `).catch(() => []),

      // Apontamentos abertos com nome do funcionário
      sinprodQuery(`
        SELECT v.DATA_HORA_INICIO, v.ORDEM_FABRICACAO, v.RECURSO,
          v.ESTAGIO_INICIO, v.FUNCIONARIO_INICIO,
          f.NOME_FUN as NOME_FUNCIONARIO
        FROM vw_pili_maq_apontamentos v
        LEFT JOIN FUNCI f ON v.FUNCIONARIO_INICIO = f.CODIGO_FUN
        ORDER BY v.DATA_HORA_INICIO DESC
      `).catch(() => []),

      // Recursos/máquinas
      sinprodQuery(`
        SELECT r.CODIGO, r.DESCRICAO, r.TIPO, cp.DESCRICAO as CENTRO
        FROM CENTROS_PRODUCAO_RECURSOS r
        LEFT JOIN CENTROS_PRODUCAO cp ON r.COD_CENTRO = cp.CODIGO
        ORDER BY r.DESCRICAO
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
        chart_data: opdsPorStatus.map((r: Record<string, unknown>) => ({
          status: r.STATUS,
          total: r.TOTAL,
        })),
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
