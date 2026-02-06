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
        sql = `SELECT * FROM crm_precos_categorias ORDER BY ordem_exibicao`;
        break;

      case 'base':
        sql = `
          SELECT pb.id,
                 pb.produto as tipo_produto,
                 pb.tipo as modelo,
                 pb.tamanho as comprimento,
                 pb.descricao,
                 pb.preco,
                 pb.ativo,
                 pb.qt_cilindros, pb.qt_motores, pb.qt_oleo,
                 pb.angulo_inclinacao, pb.ordem_exibicao, pb.created_at, pb.updated_at,
                 pc.nome as categoria_nome
          FROM crm_precos_base pb
          LEFT JOIN crm_precos_categorias pc ON pb.categoria_id = pc.id
          WHERE 1=1
        `;
        if (ativo !== null) {
          sql += ` AND pb.ativo = $${paramIndex++}`;
          params.push(ativo === 'true');
        }
        if (tipo_produto) {
          sql += ` AND pb.produto = $${paramIndex++}`;
          params.push(tipo_produto);
        }
        sql += ` ORDER BY pb.produto, pb.tipo, pb.tamanho`;
        break;

      case 'opcoes':
        sql = `
          SELECT po.id, po.categoria_id, po.codigo, po.nome, po.descricao,
                 po.preco_tipo as tipo_valor,
                 COALESCE(po.preco, 0) as valor,
                 po.ativo,
                 po.produto, po.ordem_exibicao, pc.nome as categoria_nome
          FROM crm_precos_opcoes po
          LEFT JOIN crm_precos_categorias pc ON po.categoria_id = pc.id
          WHERE 1=1
        `;
        if (ativo !== null) {
          sql += ` AND po.ativo = $${paramIndex++}`;
          params.push(ativo === 'true');
        }
        sql += ` ORDER BY pc.ordem_exibicao, po.ordem_exibicao`;
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
            produto, tipo, tamanho, descricao, preco, categoria_id, qt_cilindros, qt_motores, qt_oleo, angulo_inclinacao
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id, produto as tipo_produto, tipo as modelo, tamanho as comprimento, descricao, preco, ativo
        `;
        params = [
          dados.tipo_produto || dados.produto,
          dados.modelo || dados.tipo,
          dados.comprimento || dados.tamanho,
          dados.descricao,
          dados.preco,
          dados.categoria_id,
          dados.qt_cilindros || null,
          dados.qt_motores || null,
          dados.qt_oleo || null,
          dados.angulo_inclinacao || null,
        ];
        break;

      case 'opcoes':
        sql = `
          INSERT INTO crm_precos_opcoes (
            categoria_id, codigo, nome, descricao, preco_tipo, preco, ordem_exibicao, produto
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        params = [
          dados.categoria_id,
          dados.codigo,
          dados.nome,
          dados.descricao,
          dados.preco_tipo || dados.tipo_valor || 'FIXO',
          dados.preco || dados.valor,
          dados.ordem_exibicao || dados.ordem || 0,
          dados.produto || dados.tipo_produto_aplicavel,
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
