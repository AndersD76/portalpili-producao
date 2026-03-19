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

// GET /api/sinprod/producao — Dados de produção para o Chão de Fábrica
export async function GET(request: Request) {
  const auth = await verificarPermissao('PRODUCAO', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'dashboard';

  try {
    if (view === 'dashboard') {
      // OPDs ativas + apontamentos abertos + recursos
      const [opdsAtivas, apontamentosAbertos, recursos] = await Promise.all([
        sinprodQuery(`
          SELECT FIRST 50 o.CODIGO, o.NUMOPD, o.COD_CLIENTE, o.STATUS,
            o.DATA_PEDIDO, o.DATA_FINAL_PREV, o.DATA_INICIO, o.PRIORIDADE,
            c.NOME as CLIENTE_NOME
          FROM CADOPD o
          LEFT JOIN CLIENTES c ON o.COD_CLIENTE = c.CODIGO
          WHERE o.STATUS NOT IN ('Faturada', 'Cancelada')
          ORDER BY o.PRIORIDADE DESC, o.DATA_FINAL_PREV ASC
        `).catch(() => []),
        sinprodQuery(`
          SELECT * FROM vw_pili_maq_apontamentos
        `).catch(() => []),
        sinprodQuery(`
          SELECT r.CODIGO, r.DESCRICAO, r.TIPO, cp.DESCRICAO as CENTRO
          FROM CENTROS_PRODUCAO_RECURSOS r
          LEFT JOIN CENTROS_PRODUCAO cp ON r.COD_CENTRO = cp.CODIGO
          ORDER BY r.DESCRICAO
        `).catch(() => []),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          opds_ativas: opdsAtivas,
          apontamentos_abertos: apontamentosAbertos,
          recursos: recursos,
          total_opds: opdsAtivas.length,
          total_apontamentos: apontamentosAbertos.length,
          total_recursos: recursos.length,
        },
      });
    }

    if (view === 'apontamentos') {
      const data = await sinprodQuery(`
        SELECT FIRST 100 t.CODIGO, t.DATA_INICIO, t.HORA_INICIO, t.DATA_FIM,
          t.HORA_FIM, t.HORAS_COMPUTADAS, t.CD_FUNCIONARIO, t.CD_RECURSO,
          t.NUMOPD, t.CD_PROCESSO, t.CD_SETOR, t.QTDE_PRODUZIDA,
          t.QTDE_REFUGADA, t.QTDE_RETRABALHO,
          f.NOME_FUNCI as FUNCIONARIO_NOME
        FROM TEMPOS_PRODUCAO_LEITORES t
        LEFT JOIN FUNCI f ON t.CD_FUNCIONARIO = f.CODIGO_FUN
        ORDER BY t.CODIGO DESC
      `);

      return NextResponse.json({ success: true, data });
    }

    if (view === 'funcionarios') {
      const data = await sinprodQuery(`
        SELECT f.CODIGO_FUN, f.CD_CRACHA, f.NOME_FUNCI, f.FORA_DE_USO
        FROM FUNCI f
        WHERE f.FORA_DE_USO = '0'
        ORDER BY f.NOME_FUNCI
      `);

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'View inválida' }, { status: 400 });
  } catch (error) {
    console.error('[SINPROD] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao consultar SINPROD',
    }, { status: 500 });
  }
}
