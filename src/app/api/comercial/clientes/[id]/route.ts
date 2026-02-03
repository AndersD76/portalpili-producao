import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT
        c.*,
        v.nome as vendedor_nome,
        v.email as vendedor_email,
        json_agg(DISTINCT jsonb_build_object(
          'id', ct.id,
          'nome', ct.nome,
          'cargo', ct.cargo,
          'email', ct.email,
          'telefone', ct.telefone,
          'principal', ct.principal
        )) FILTER (WHERE ct.id IS NOT NULL) as contatos,
        json_agg(DISTINCT jsonb_build_object(
          'id', o.id,
          'titulo', o.titulo,
          'valor_estimado', o.valor_estimado,
          'estagio', o.estagio,
          'situacao', o.situacao,
          'created_at', o.created_at
        )) FILTER (WHERE o.id IS NOT NULL) as oportunidades,
        COUNT(DISTINCT o.id) as total_oportunidades,
        SUM(CASE WHEN o.situacao = 'GANHA' THEN o.valor_estimado ELSE 0 END) as valor_total_compras
      FROM crm_clientes c
      LEFT JOIN crm_vendedores v ON c.vendedor_responsavel_id = v.id
      LEFT JOIN crm_contatos ct ON c.id = ct.cliente_id
      LEFT JOIN crm_oportunidades o ON c.id = o.cliente_id
      WHERE c.id = $1
      GROUP BY c.id, v.nome, v.email`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar cliente' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
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
      status,
      tags,
      observacoes,
      score_credito,
      potencial,
    } = body;

    const result = await query(
      `UPDATE crm_clientes SET
        razao_social = COALESCE($2, razao_social),
        nome_fantasia = COALESCE($3, nome_fantasia),
        segmento = COALESCE($4, segmento),
        porte = COALESCE($5, porte),
        endereco = COALESCE($6, endereco),
        cidade = COALESCE($7, cidade),
        estado = COALESCE($8, estado),
        cep = COALESCE($9, cep),
        telefone = COALESCE($10, telefone),
        email = COALESCE($11, email),
        website = COALESCE($12, website),
        vendedor_responsavel_id = COALESCE($13, vendedor_responsavel_id),
        status = COALESCE($14, status),
        tags = COALESCE($15, tags),
        observacoes = COALESCE($16, observacoes),
        score_credito = COALESCE($17, score_credito),
        potencial = COALESCE($18, potencial),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [id, razao_social, nome_fantasia, segmento, porte, endereco, cidade, estado, cep, telefone, email, website, vendedor_responsavel_id, status, tags, observacoes, score_credito, potencial]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Cliente atualizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar cliente' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verifica se há oportunidades ativas
    const oportunidades = await query(
      `SELECT COUNT(*) as total FROM crm_oportunidades WHERE cliente_id = $1 AND situacao NOT IN ('GANHA', 'PERDIDA', 'CANCELADA')`,
      [id]
    );

    if (parseInt(oportunidades?.rows[0]?.total || '0') > 0) {
      return NextResponse.json(
        { success: false, error: 'Cliente possui oportunidades ativas' },
        { status: 400 }
      );
    }

    // Soft delete - muda status para INATIVO
    const result = await query(
      `UPDATE crm_clientes SET status = 'INATIVO', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cliente inativado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao inativar cliente:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao inativar cliente' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
