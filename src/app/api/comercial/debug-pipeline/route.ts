import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Query simples do pipeline
    const pipelineResult = await query(`
      SELECT
        estagio,
        COUNT(*) as quantidade,
        SUM(valor_estimado) as valor_total
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
    `);

    // Contagem total
    const totalResult = await query('SELECT COUNT(*) as total FROM crm_oportunidades WHERE status = $1', ['ABERTA']);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalOportunidades: totalResult?.rows[0]?.total || 0,
      pipeline: pipelineResult?.rows || [],
      message: 'API de debug funcionando corretamente'
    });
  } catch (error) {
    console.error('Erro no debug pipeline:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
