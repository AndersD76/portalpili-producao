import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { gerarFollowUp, buscarOportunidadesSemFollowUp } from '@/lib/comercial/followup';

/**
 * GET /api/comercial/followup
 * Lista oportunidades que precisam de follow-up (sem atividade pendente, paradas há dias)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vendedor_id = searchParams.get('vendedor_id');
    const usuario_id = searchParams.get('usuario_id');
    const dias = parseInt(searchParams.get('dias') || '7');

    // Se usuario_id, buscar vendedor_id correspondente
    let vId: number | undefined;
    if (usuario_id) {
      const vResult = await query(
        `SELECT id FROM crm_vendedores WHERE usuario_id = $1`,
        [usuario_id]
      );
      if (vResult?.rows[0]) {
        vId = vResult.rows[0].id;
      }
    } else if (vendedor_id) {
      vId = parseInt(vendedor_id);
    }

    const oportunidades = await buscarOportunidadesSemFollowUp(vId, dias);

    return NextResponse.json({
      success: true,
      data: oportunidades,
      total: oportunidades.length,
    });
  } catch (error) {
    console.error('Erro ao buscar follow-ups:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar follow-ups pendentes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/comercial/followup
 * Gera follow-ups para oportunidades específicas ou todas que precisam
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { oportunidade_ids, dias } = body;

    let targets: Array<{ id: number; estagio: string; vendedor_id: number }> = [];

    if (oportunidade_ids && oportunidade_ids.length > 0) {
      // Gerar para oportunidades específicas
      const result = await query(
        `SELECT id, estagio, vendedor_id FROM crm_oportunidades WHERE id = ANY($1)`,
        [oportunidade_ids]
      );
      targets = result?.rows || [];
    } else {
      // Gerar para todas que precisam
      const sem = await buscarOportunidadesSemFollowUp(undefined, dias || 7);
      for (const opp of sem) {
        const oppResult = await query(
          `SELECT id, estagio, vendedor_id FROM crm_oportunidades WHERE id = $1`,
          [opp.id]
        );
        if (oppResult?.rows[0]) {
          targets.push(oppResult.rows[0]);
        }
      }
    }

    const resultados = [];
    for (const target of targets) {
      const result = await gerarFollowUp(target.id, target.estagio, target.vendedor_id);
      resultados.push({
        oportunidade_id: target.id,
        ...result,
      });
    }

    const criados = resultados.filter(r => r.created).length;

    return NextResponse.json({
      success: true,
      data: resultados,
      message: `${criados} follow-ups criados de ${targets.length} oportunidades processadas`,
    });
  } catch (error) {
    console.error('Erro ao gerar follow-ups:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar follow-ups' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
