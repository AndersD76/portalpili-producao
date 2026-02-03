import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { carregarPrecos, invalidarCachePrecos } from '@/lib/comercial';

/**
 * API de administração de preços
 * Permite visualizar e gerenciar a tabela de preços configurável
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo'); // base, opcoes, descontos, categorias, regras
    const ativo = searchParams.get('ativo');
    const tipo_produto = searchParams.get('tipo_produto');

    let sql = '';
    const params: unknown[] = [];
    let paramIndex = 1;

    switch (tipo) {
      case 'categorias':
        sql = `SELECT * FROM crm_precos_categorias ORDER BY ordem`;
        break;

      case 'base':
        sql = `
          SELECT pb.*, pc.nome as categoria_nome
          FROM crm_precos_base pb
          LEFT JOIN crm_precos_categorias pc ON pb.categoria_id = pc.id
          WHERE 1=1
        `;
        if (ativo !== null) {
          sql += ` AND pb.ativo = $${paramIndex++}`;
          params.push(ativo === 'true');
        }
        if (tipo_produto) {
          sql += ` AND pb.tipo_produto = $${paramIndex++}`;
          params.push(tipo_produto);
        }
        sql += ` ORDER BY pb.tipo_produto, pb.modelo, pb.comprimento`;
        break;

      case 'opcoes':
        sql = `
          SELECT po.*, pc.nome as categoria_nome
          FROM crm_precos_opcoes po
          LEFT JOIN crm_precos_categorias pc ON po.categoria_id = pc.id
          WHERE 1=1
        `;
        if (ativo !== null) {
          sql += ` AND po.ativo = $${paramIndex++}`;
          params.push(ativo === 'true');
        }
        sql += ` ORDER BY pc.ordem, po.ordem`;
        break;

      case 'descontos':
        sql = `SELECT * FROM crm_precos_descontos WHERE 1=1`;
        if (ativo !== null) {
          sql += ` AND ativo = $${paramIndex++}`;
          params.push(ativo === 'true');
        }
        sql += ` ORDER BY tipo, valor_minimo`;
        break;

      case 'regras':
        sql = `SELECT * FROM crm_precos_regras WHERE 1=1`;
        if (ativo !== null) {
          sql += ` AND ativo = $${paramIndex++}`;
          params.push(ativo === 'true');
        }
        sql += ` ORDER BY prioridade DESC`;
        break;

      case 'config':
        sql = `SELECT * FROM crm_precos_config ORDER BY chave`;
        break;

      default:
        // Retorna resumo geral
        const cache = await carregarPrecos(true);
        return NextResponse.json({
          success: true,
          data: {
            total_precos_base: cache.precosBase.length,
            total_opcoes: cache.opcoes.length,
            total_descontos: cache.descontos.length,
            total_regras: cache.regras.length,
            total_config: cache.configuracoes.length,
            ultima_atualizacao: cache.ultimaAtualizacao,
          },
        });
    }

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar preços:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar preços' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tipo, dados, usuario_id } = body;

    if (!tipo || !dados) {
      return NextResponse.json(
        { success: false, error: 'Tipo e dados são obrigatórios' },
        { status: 400 }
      );
    }

    let result;
    let sql = '';
    let params: unknown[] = [];

    switch (tipo) {
      case 'base':
        sql = `
          INSERT INTO crm_precos_base (
            tipo_produto, modelo, comprimento, descricao, preco, categoria_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        params = [
          dados.tipo_produto,
          dados.modelo,
          dados.comprimento,
          dados.descricao,
          dados.preco,
          dados.categoria_id,
        ];
        break;

      case 'opcoes':
        sql = `
          INSERT INTO crm_precos_opcoes (
            categoria_id, codigo, nome, descricao, tipo_valor, valor, ordem, tipo_produto_aplicavel
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        params = [
          dados.categoria_id,
          dados.codigo,
          dados.nome,
          dados.descricao,
          dados.tipo_valor || 'FIXO',
          dados.valor,
          dados.ordem || 0,
          dados.tipo_produto_aplicavel,
        ];
        break;

      case 'descontos':
        sql = `
          INSERT INTO crm_precos_descontos (
            tipo, nome, descricao, percentual, valor_minimo, valor_maximo,
            quantidade_minima, segmentos_aplicaveis, regioes_aplicaveis
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        params = [
          dados.tipo,
          dados.nome,
          dados.descricao,
          dados.percentual,
          dados.valor_minimo,
          dados.valor_maximo,
          dados.quantidade_minima,
          dados.segmentos_aplicaveis,
          dados.regioes_aplicaveis,
        ];
        break;

      case 'regras':
        sql = `
          INSERT INTO crm_precos_regras (
            nome, descricao, condicoes, tipo_acao, valor_acao, prioridade
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;
        params = [
          dados.nome,
          dados.descricao,
          JSON.stringify(dados.condicoes),
          dados.tipo_acao,
          dados.valor_acao,
          dados.prioridade || 0,
        ];
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Tipo inválido' },
          { status: 400 }
        );
    }

    result = await query(sql, params);

    // Registra no histórico
    await query(
      `INSERT INTO crm_precos_historico (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id, motivo)
       VALUES ($1, $2, 'CRIACAO', NULL, $3, $4, 'Novo registro')`,
      [`crm_precos_${tipo}`, result?.rows[0]?.id, JSON.stringify(result?.rows[0]), usuario_id]
    );

    // Invalida cache
    invalidarCachePrecos();

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Registro criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar preço:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar preço' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
