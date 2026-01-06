import { NextResponse } from 'next/server';
import { buscarOPDsSinprod, buscarOPDPorNumero } from '@/lib/firebird';

// GET - Buscar OPDs do SINPROD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const numero = searchParams.get('numero');

    if (numero) {
      // Buscar OPD específica
      const opd = await buscarOPDPorNumero(numero);
      if (opd) {
        return NextResponse.json({
          success: true,
          data: opd
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'OPD não encontrada no SINPROD'
        }, { status: 404 });
      }
    }

    // Buscar todas as OPDs recentes
    const opds = await buscarOPDsSinprod();
    return NextResponse.json({
      success: true,
      data: opds,
      total: opds.length
    });
  } catch (error: any) {
    console.error('Erro ao buscar OPDs do SINPROD:', error);
    return NextResponse.json({
      success: false,
      error: `Erro ao conectar com SINPROD: ${error.message}`
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
