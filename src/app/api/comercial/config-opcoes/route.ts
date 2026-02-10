import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ConfigOpcao {
  id: number;
  grupo: string;
  codigo: string;
  nome: string;
  descricao?: string;
  preco: number;
  preco_adicional?: number;
  tamanhos_aplicaveis: string;
  tipo_produto: string;
  ordem: number;
  ativo: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo_produto = searchParams.get('tipo_produto'); // TOMBADOR, COLETOR ou AMBOS
    const grupo = searchParams.get('grupo');
    const tamanho = searchParams.get('tamanho');

    let sql = `
      SELECT
        id,
        grupo,
        codigo,
        nome,
        descricao,
        COALESCE(preco, 0) as preco,
        COALESCE(preco, 0) as preco_adicional,
        COALESCE(tamanhos_aplicaveis, 'ALL') as tamanhos_aplicaveis,
        tipo_produto,
        COALESCE(ordem, 1) as ordem,
        ativo
      FROM crm_config_opcoes
      WHERE ativo = TRUE
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (tipo_produto) {
      sql += ` AND (tipo_produto = $${paramIndex++} OR tipo_produto = 'AMBOS')`;
      params.push(tipo_produto);
    }

    if (grupo) {
      sql += ` AND grupo = $${paramIndex++}`;
      params.push(grupo);
    }

    sql += ` ORDER BY grupo, ordem`;

    const result = await query(sql, params);

    // Se um tamanho específico foi informado, filtrar opções aplicáveis
    let opcoes: ConfigOpcao[] = result?.rows || [];

    if (tamanho) {
      opcoes = opcoes.filter((opt: ConfigOpcao) => {
        if (!opt.tamanhos_aplicaveis || opt.tamanhos_aplicaveis === 'ALL') return true;
        const tamanhos = opt.tamanhos_aplicaveis.split(',').map((t: string) => t.trim());
        return tamanhos.includes(tamanho);
      });
    }

    // Agrupar por grupo
    const agrupado: Record<string, ConfigOpcao[]> = {};
    for (const opt of opcoes) {
      if (!agrupado[opt.grupo]) {
        agrupado[opt.grupo] = [];
      }
      agrupado[opt.grupo].push(opt);
    }

    return NextResponse.json({
      success: true,
      data: opcoes,
      agrupado
    });
  } catch (error) {
    console.error('Erro ao buscar opções de configuração:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar opções' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
