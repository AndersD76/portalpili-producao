import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { reajustarPrecosBase, reajustarOpcionais, invalidarCachePrecos } from '@/lib/comercial';

/**
 * Endpoint para reajuste em massa de preços
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tipo, // 'base' | 'opcoes' | 'todos'
      percentual,
      tipo_produto, // opcional - filtra por tipo
      categoria_id, // opcional - filtra por categoria
    } = body;

    if (!percentual || percentual === 0) {
      return NextResponse.json(
        { success: false, error: 'Percentual de reajuste é obrigatório' },
        { status: 400 }
      );
    }

    if (Math.abs(percentual) > 50) {
      return NextResponse.json(
        { success: false, error: 'Reajuste máximo permitido é 50%' },
        { status: 400 }
      );
    }

    let totalAtualizados = 0;
    const detalhes: { tabela: string; registros: number }[] = [];

    // Reajusta preços base
    if (tipo === 'base' || tipo === 'todos') {
      const qtdBase = await reajustarPrecosBase(percentual, tipo_produto);
      totalAtualizados += qtdBase;
      detalhes.push({ tabela: 'crm_precos_base', registros: qtdBase });
    }

    // Reajusta opcionais
    if (tipo === 'opcoes' || tipo === 'todos') {
      const qtdOpcoes = await reajustarOpcionais(percentual, categoria_id);
      totalAtualizados += qtdOpcoes;
      detalhes.push({ tabela: 'crm_precos_opcoes', registros: qtdOpcoes });
    }

    // Historico registrado automaticamente pelos triggers
    // Invalida cache
    invalidarCachePrecos();

    return NextResponse.json({
      success: true,
      data: {
        percentual_aplicado: percentual,
        total_registros_atualizados: totalAtualizados,
        detalhes,
      },
      message: `Reajuste de ${percentual}% aplicado com sucesso em ${totalAtualizados} registros`,
    });
  } catch (error) {
    console.error('Erro ao reajustar preços:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao reajustar preços' },
      { status: 500 }
    );
  }
}

/**
 * Simula reajuste sem aplicar
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { tipo, percentual, tipo_produto, categoria_id } = body;

    if (!percentual) {
      return NextResponse.json(
        { success: false, error: 'Percentual é obrigatório' },
        { status: 400 }
      );
    }

    // Simula reajuste em precos base
    let sqlBase = `
      SELECT
        id, descricao, preco as preco_atual,
        ROUND(preco * (1 + $1::numeric / 100), 2) as preco_novo,
        ROUND(preco * $1::numeric / 100, 2) as diferenca
      FROM crm_precos_base
      WHERE ativo = true
    `;
    const paramsBase: unknown[] = [percentual];
    let paramIndex = 2;

    if (tipo_produto) {
      sqlBase += ` AND produto = $${paramIndex++}`;
      paramsBase.push(tipo_produto);
    }

    sqlBase += ` ORDER BY produto, tipo, tamanho`;

    // Simula reajuste em opcionais
    let sqlOpcoes = `
      SELECT
        id, nome, preco as valor_atual,
        ROUND(preco * (1 + $1::numeric / 100), 2) as valor_novo,
        ROUND(preco * $1::numeric / 100, 2) as diferenca
      FROM crm_precos_opcoes
      WHERE ativo = true AND preco_tipo = 'FIXO'
    `;
    const paramsOpcoes: unknown[] = [percentual];
    let paramIndexOpcoes = 2;

    if (categoria_id) {
      sqlOpcoes += ` AND categoria_id = $${paramIndexOpcoes++}`;
      paramsOpcoes.push(categoria_id);
    }

    sqlOpcoes += ` ORDER BY categoria_id, ordem_exibicao`;

    const [resultBase, resultOpcoes] = await Promise.all([
      tipo !== 'opcoes' ? query(sqlBase, paramsBase) : Promise.resolve({ rows: [] }),
      tipo !== 'base' ? query(sqlOpcoes, paramsOpcoes) : Promise.resolve({ rows: [] }),
    ]);

    // Calcula totais
    const totalBase = resultBase?.rows?.reduce(
      (acc, r) => ({ atual: acc.atual + parseFloat(r.preco_atual), novo: acc.novo + parseFloat(r.preco_novo) }),
      { atual: 0, novo: 0 }
    ) || { atual: 0, novo: 0 };

    const totalOpcoes = resultOpcoes?.rows?.reduce(
      (acc, r) => ({ atual: acc.atual + parseFloat(r.valor_atual), novo: acc.novo + parseFloat(r.valor_novo) }),
      { atual: 0, novo: 0 }
    ) || { atual: 0, novo: 0 };

    return NextResponse.json({
      success: true,
      data: {
        percentual,
        simulacao_base: {
          registros: resultBase?.rows || [],
          quantidade: resultBase?.rows?.length || 0,
          total_atual: totalBase.atual,
          total_novo: totalBase.novo,
        },
        simulacao_opcoes: {
          registros: resultOpcoes?.rows || [],
          quantidade: resultOpcoes?.rows?.length || 0,
          total_atual: totalOpcoes.atual,
          total_novo: totalOpcoes.novo,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao simular reajuste:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao simular reajuste' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
