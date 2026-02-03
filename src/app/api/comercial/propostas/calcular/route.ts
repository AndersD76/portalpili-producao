import { NextResponse } from 'next/server';
import { calcularPreco, simularCenarios, ParametrosCalculo } from '@/lib/comercial';

/**
 * Endpoint para cálculo de preços sem criar proposta
 * Útil para simulações e prévia de valores
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tipo_produto,
      modelo,
      comprimento,
      angulo_giro,
      quantidade,
      opcionais_ids,
      segmento_cliente,
      regiao_cliente,
      desconto_manual,
      condicao_pagamento,
      prazo_entrega,
      simular_cenarios,
    } = body;

    if (!tipo_produto) {
      return NextResponse.json(
        { success: false, error: 'Tipo de produto é obrigatório' },
        { status: 400 }
      );
    }

    const parametros: ParametrosCalculo = {
      tipoProduto: tipo_produto,
      modelo: modelo || (tipo_produto === 'TOMBADOR' ? 'SIMPLES' : '180'),
      comprimento: comprimento,
      quantidade: quantidade || 1,
      opcionaisSelecionados: opcionais_ids || [],
      segmentoCliente: segmento_cliente,
      regiaoCliente: regiao_cliente,
      descontoManual: desconto_manual,
      condicaoPagamento: condicao_pagamento,
      prazoEntrega: prazo_entrega,
    };

    // Calcula preço principal
    const resultado = await calcularPreco(parametros);

    // Se solicitou simulação de cenários
    let cenarios = null;
    if (simular_cenarios && Array.isArray(simular_cenarios)) {
      cenarios = await simularCenarios(parametros, simular_cenarios);
    }

    return NextResponse.json({
      success: true,
      data: {
        calculo: resultado,
        cenarios,
        parametros_utilizados: parametros,
      },
    });
  } catch (error: unknown) {
    console.error('Erro ao calcular preço:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro ao calcular preço' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
