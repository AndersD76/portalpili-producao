import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { consultarCNPJ, enriquecerCliente } from '@/lib/comercial';
import { verificarPermissao } from '@/lib/auth';

export async function GET(request: Request) {
  // Verificar permissão de visualização
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const segmento = searchParams.get('segmento');
    const vendedor_id = searchParams.get('vendedor_id');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        c.*,
        v.nome as vendedor_nome,
        COUNT(DISTINCT o.id) as total_oportunidades,
        SUM(CASE WHEN o.status = 'GANHA' THEN o.valor_estimado ELSE 0 END) as valor_total_compras,
        MAX(o.created_at) as ultima_oportunidade
      FROM crm_clientes c
      LEFT JOIN crm_vendedores v ON c.vendedor_id = v.id
      LEFT JOIN crm_oportunidades o ON c.id = o.cliente_id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND c.status = $${paramIndex++}`;
      params.push(status);
    }

    if (segmento) {
      sql += ` AND c.segmento = $${paramIndex++}`;
      params.push(segmento);
    }

    if (vendedor_id) {
      sql += ` AND c.vendedor_id = $${paramIndex++}`;
      params.push(vendedor_id);
    }

    if (search) {
      sql += ` AND (c.razao_social ILIKE $${paramIndex} OR c.nome_fantasia ILIKE $${paramIndex} OR c.cpf_cnpj ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += `
      GROUP BY c.id, v.nome
      ORDER BY c.razao_social
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Conta total para paginação
    let countSql = `SELECT COUNT(DISTINCT c.id) as total FROM crm_clientes c WHERE 1=1`;
    const countParams: unknown[] = [];
    let countParamIndex = 1;

    if (status) {
      countSql += ` AND c.status = $${countParamIndex++}`;
      countParams.push(status);
    }
    if (segmento) {
      countSql += ` AND c.segmento = $${countParamIndex++}`;
      countParams.push(segmento);
    }
    if (vendedor_id) {
      countSql += ` AND c.vendedor_id = $${countParamIndex++}`;
      countParams.push(vendedor_id);
    }
    if (search) {
      countSql += ` AND (c.razao_social ILIKE $${countParamIndex} OR c.nome_fantasia ILIKE $${countParamIndex} OR c.cpf_cnpj ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
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
    console.error('Erro ao buscar clientes:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Verificar permissão de criação
  const auth = await verificarPermissao('COMERCIAL', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const {
      cnpj,
      razao_social,
      nome_fantasia,
      segmento,
      porte,
      endereco,
      cidade,
      estado,
      cep,
      telefone,
      email,
      website,
      vendedor_responsavel_id,
      origem,
      tags,
      observacoes,
      enriquecer = true, // Por padrão, enriquece com dados do CNPJ
    } = body;

    if (!cnpj) {
      return NextResponse.json(
        { success: false, error: 'CNPJ é obrigatório' },
        { status: 400 }
      );
    }

    // Verifica se já existe cliente com este CNPJ
    const existing = await query(
      'SELECT id FROM crm_clientes WHERE cpf_cnpj = $1',
      [cnpj.replace(/[^\d]/g, '')]
    );

    if (existing?.rowCount && existing.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Já existe um cliente com este CNPJ' },
        { status: 409 }
      );
    }

    // Tenta enriquecer dados via CNPJ
    let dadosEnriquecidos = null;
    let analiseIA = null;

    if (enriquecer) {
      try {
        const enriquecimento = await enriquecerCliente(cnpj);
        if (enriquecimento) {
          dadosEnriquecidos = enriquecimento.dados_cnpj;
          analiseIA = {
            segmento_sugerido: enriquecimento.segmento_sugerido,
            potencial: enriquecimento.potencial_estimado,
            score: enriquecimento.score_credito,
            alertas: enriquecimento.alertas,
            tags: enriquecimento.tags_sugeridas,
          };
        }
      } catch (enrichError) {
        console.log('Não foi possível enriquecer dados do CNPJ:', enrichError);
      }
    }

    // Usa dados enriquecidos se disponíveis, senão usa os fornecidos
    const clienteData = {
      cnpj: cnpj.replace(/[^\d]/g, ''),
      razao_social: razao_social || dadosEnriquecidos?.razao_social,
      nome_fantasia: nome_fantasia || dadosEnriquecidos?.nome_fantasia,
      segmento: segmento || analiseIA?.segmento_sugerido,
      porte: porte || dadosEnriquecidos?.porte,
      endereco: endereco || dadosEnriquecidos?.endereco?.logradouro,
      cidade: cidade || dadosEnriquecidos?.endereco?.cidade,
      estado: estado || dadosEnriquecidos?.endereco?.estado,
      cep: cep || dadosEnriquecidos?.endereco?.cep,
      telefone: telefone || dadosEnriquecidos?.telefone,
      email: email || dadosEnriquecidos?.email,
      website,
      vendedor_responsavel_id,
      origem: origem || 'MANUAL',
      tags: tags || analiseIA?.tags,
      observacoes,
      dados_receita: dadosEnriquecidos,
      score_credito: analiseIA?.score,
      potencial: analiseIA?.potencial,
    };

    if (!clienteData.razao_social) {
      return NextResponse.json(
        { success: false, error: 'Razão social é obrigatória' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO crm_clientes (
        cpf_cnpj, razao_social, nome_fantasia, segmento, porte,
        logradouro, municipio, estado, cep, telefone, email,
        vendedor_id, origem, tags, observacoes, score_potencial
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        clienteData.cnpj,
        clienteData.razao_social,
        clienteData.nome_fantasia,
        clienteData.segmento,
        clienteData.porte,
        clienteData.endereco,
        clienteData.cidade,
        clienteData.estado,
        clienteData.cep,
        clienteData.telefone,
        clienteData.email,
        clienteData.vendedor_responsavel_id,
        clienteData.origem,
        clienteData.tags,
        clienteData.observacoes,
        clienteData.score_credito,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      analise_ia: analiseIA,
      message: 'Cliente criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar cliente' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
