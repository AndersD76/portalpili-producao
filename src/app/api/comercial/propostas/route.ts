import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { calcularPreco, ParametrosCalculo } from '@/lib/comercial';
import { verificarPermissao } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const oportunidade_id = searchParams.get('oportunidade_id');
    const cliente_id = searchParams.get('cliente_id');
    let vendedor_id = searchParams.get('vendedor_id');
    const situacao = searchParams.get('situacao');
    const tipo_produto = searchParams.get('tipo_produto');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // SERVER-SIDE: Se NÃO é admin, forçar filtro pelo vendedor do usuário logado
    const isAdmin = auth.usuario.is_admin;
    let vendedorNaoEncontrado = false;
    if (!isAdmin && !vendedor_id) {
      const vendedorResult = await query(
        `SELECT id FROM crm_vendedores WHERE usuario_id = $1`,
        [auth.usuario.id]
      );
      if (vendedorResult?.rows?.length) {
        vendedor_id = String(vendedorResult.rows[0].id);
      } else {
        const vendedorByName = await query(
          `SELECT id FROM crm_vendedores WHERE LOWER(nome) = LOWER($1) OR nome ILIKE $2 LIMIT 1`,
          [auth.usuario.nome, `%${auth.usuario.nome.split(' ')[0]}%`]
        );
        if (vendedorByName?.rows?.length) {
          vendedor_id = String(vendedorByName.rows[0].id);
        } else {
          console.warn(`[PROPOSTAS] Vendedor não encontrado para usuário ${auth.usuario.id} (${auth.usuario.nome})`);
          vendedorNaoEncontrado = true;
        }
      }
    }

    // Se não é admin e não tem vendedor vinculado, retorna lista vazia
    if (vendedorNaoEncontrado) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        aviso: 'Seu usuário não está vinculado a um vendedor. Contate o administrador.',
      });
    }

    let sql = `
      SELECT
        p.*,
        o.titulo as oportunidade_titulo,
        c.razao_social as cliente_nome,
        c.nome_fantasia as cliente_fantasia,
        c.cpf_cnpj as cliente_cnpj,
        v.nome as vendedor_nome
      FROM crm_propostas p
      LEFT JOIN crm_oportunidades o ON p.oportunidade_id = o.id
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (oportunidade_id) {
      sql += ` AND p.oportunidade_id = $${paramIndex++}`;
      params.push(oportunidade_id);
    }

    if (cliente_id) {
      sql += ` AND p.cliente_id = $${paramIndex++}`;
      params.push(cliente_id);
    }

    if (vendedor_id) {
      sql += ` AND p.vendedor_id = $${paramIndex++}`;
      params.push(vendedor_id);
    }

    if (situacao) {
      sql += ` AND p.situacao = $${paramIndex++}`;
      params.push(situacao);
    }

    if (tipo_produto) {
      sql += ` AND p.produto = $${paramIndex++}`;
      params.push(tipo_produto);
    }

    if (search) {
      sql += ` AND (CAST(p.numero_proposta AS TEXT) ILIKE $${paramIndex} OR c.razao_social ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += `
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Conta total para paginação (replica todos os filtros da query principal)
    let countSql = `
      SELECT COUNT(*) as total FROM crm_propostas p
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      WHERE 1=1
    `;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (oportunidade_id) {
      countSql += ` AND p.oportunidade_id = $${countParamIndex++}`;
      countParams.push(oportunidade_id);
    }
    if (cliente_id) {
      countSql += ` AND p.cliente_id = $${countParamIndex++}`;
      countParams.push(cliente_id);
    }
    if (vendedor_id) {
      countSql += ` AND p.vendedor_id = $${countParamIndex++}`;
      countParams.push(vendedor_id);
    }
    if (situacao) {
      countSql += ` AND p.situacao = $${countParamIndex++}`;
      countParams.push(situacao);
    }
    if (tipo_produto) {
      countSql += ` AND p.produto = $${countParamIndex++}`;
      countParams.push(tipo_produto);
    }
    if (search) {
      countSql += ` AND (CAST(p.numero_proposta AS TEXT) ILIKE $${countParamIndex} OR c.razao_social ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult?.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar propostas:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar propostas' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await verificarPermissao('COMERCIAL', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const {
      oportunidade_id,
      cliente_id,
      vendedor_id,
      tipo_produto,
      modelo,
      comprimento,
      angulo_giro,
      quantidade,
      opcionais_ids,
      dados_cliente,
      dados_entrega,
      condicoes_comerciais,
      observacoes,
      calcular_preco = true,
    } = body;

    if (!cliente_id || !vendedor_id || !tipo_produto) {
      return NextResponse.json(
        { success: false, error: 'Cliente, vendedor e tipo de produto são obrigatórios' },
        { status: 400 }
      );
    }

    // Gera número da proposta (ANO + sequencial)
    const anoAtual = new Date().getFullYear();
    const seqResult = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 6) AS INTEGER)), 0) + 1 as seq
       FROM crm_propostas
       WHERE numero LIKE $1`,
      [`${anoAtual}-%`]
    );
    const sequencial = seqResult?.rows[0]?.seq || 1;
    const numero = `${anoAtual}-${String(sequencial).padStart(4, '0')}`;

    // Calcula preço se solicitado
    let resultadoCalculo = null;
    if (calcular_preco) {
      const parametros: ParametrosCalculo = {
        tipoProduto: tipo_produto,
        modelo: modelo || (tipo_produto === 'TOMBADOR' ? 'SIMPLES' : '180'),
        comprimento: comprimento,
        quantidade: quantidade || 1,
        opcionaisSelecionados: opcionais_ids || [],
        segmentoCliente: dados_cliente?.segmento,
        regiaoCliente: dados_entrega?.estado,
        descontoManual: condicoes_comerciais?.desconto_manual,
        condicaoPagamento: condicoes_comerciais?.forma_pagamento,
      };

      try {
        resultadoCalculo = await calcularPreco(parametros);
      } catch (calcError) {
        console.error('Erro ao calcular preço:', calcError);
        // Continua sem cálculo automático
      }
    }

    // Determina colunas baseado no tipo de produto
    const isTombador = tipo_produto === 'TOMBADOR';

    const result = await query(
      `INSERT INTO crm_propostas (
        oportunidade_id, cliente_id, vendedor_id,
        produto, situacao, data_validade,
        ${isTombador ? 'tombador_tamanho, tombador_tipo, tombador_modelo, tombador_quantidade, tombador_preco_base, tombador_subtotal_opcionais, tombador_total_geral' : 'coletor_grau_rotacao, coletor_tipo, coletor_modelo, coletor_quantidade, coletor_preco_base, coletor_subtotal_opcionais, coletor_total_geral'},
        desconto_valor, valor_total
      ) VALUES ($1, $2, $3, $4, 'RASCUNHO', NOW() + INTERVAL '30 days', $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        oportunidade_id,
        cliente_id,
        vendedor_id,
        tipo_produto,
        isTombador ? comprimento : angulo_giro,
        isTombador ? (modelo || 'FIXO') : 'ROTATIVO',
        modelo || (isTombador ? `TB-${comprimento}` : `CL-${angulo_giro}`),
        quantidade || 1,
        resultadoCalculo?.subtotal || 0,
        resultadoCalculo?.subtotalOpcionais || 0,
        resultadoCalculo?.total || 0,
        resultadoCalculo?.descontoValor || 0,
        resultadoCalculo?.total || 0,
      ]
    );

    // Registra no histórico
    await query(
      `INSERT INTO crm_propostas_historico (proposta_id, versao, dados_snapshot, motivo_alteracao, alterado_por)
       VALUES ($1, 1, $2, 'Proposta criada', $3)`,
      [result?.rows[0]?.id, JSON.stringify(result?.rows[0]), vendedor_id]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      calculo: resultadoCalculo,
      message: 'Proposta criada com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar proposta:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar proposta' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
