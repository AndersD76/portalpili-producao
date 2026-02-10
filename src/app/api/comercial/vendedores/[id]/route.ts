import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('COMERCIAL', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;

    const result = await query(
      `SELECT
        v.*,
        COUNT(DISTINCT o.id) as total_oportunidades,
        COUNT(DISTINCT CASE WHEN o.estagio = 'FECHAMENTO' AND o.status = 'GANHA' THEN o.id END) as oportunidades_ganhas,
        SUM(CASE WHEN o.estagio = 'FECHAMENTO' AND o.status = 'GANHA' THEN o.valor_estimado ELSE 0 END) as valor_total_ganho,
        COUNT(DISTINCT c.id) as total_clientes,
        json_agg(DISTINCT jsonb_build_object(
          'id', m.id,
          'mes', m.mes,
          'ano', m.ano,
          'meta', m.meta_valor,
          'realizado', m.realizado_valor
        )) FILTER (WHERE m.id IS NOT NULL) as metas
      FROM crm_vendedores v
      LEFT JOIN crm_oportunidades o ON v.id = o.vendedor_id
      LEFT JOIN crm_clientes c ON v.id = c.vendedor_id
      LEFT JOIN crm_metas m ON v.id = m.vendedor_id AND m.ano = EXTRACT(YEAR FROM NOW())
      WHERE v.id = $1
      GROUP BY v.id`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Vendedor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar vendedor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar vendedor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('COMERCIAL', 'editar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;
    const body = await request.json();

    const {
      nome,
      email,
      telefone,
      cargo,
      meta_mensal,
      comissao_padrao,
      avatar_url,
      ativo,
      tipo,
    } = body;

    const result = await query(
      `UPDATE crm_vendedores SET
        nome = COALESCE($2, nome),
        email = COALESCE($3, email),
        telefone = COALESCE($4, telefone),
        cargo = COALESCE($5, cargo),
        meta_mensal = COALESCE($6, meta_mensal),
        comissao_padrao = COALESCE($7, comissao_padrao),
        avatar_url = COALESCE($8, avatar_url),
        ativo = COALESCE($9, ativo),
        tipo = COALESCE($10, tipo),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [id, nome, email, telefone, cargo, meta_mensal, comissao_padrao, avatar_url, ativo, tipo]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Vendedor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Vendedor atualizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar vendedor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar vendedor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('COMERCIAL', 'excluir');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id } = await params;

    // Remover referências em outras tabelas primeiro
    await query(`UPDATE crm_oportunidades SET vendedor_id = NULL WHERE vendedor_id = $1`, [id]);
    await query(`UPDATE crm_clientes SET vendedor_id = NULL WHERE vendedor_id = $1`, [id]);
    await query(`UPDATE crm_interacoes SET vendedor_id = NULL WHERE vendedor_id = $1`, [id]);
    await query(`UPDATE crm_atividades SET vendedor_id = NULL WHERE vendedor_id = $1`, [id]);
    await query(`UPDATE crm_propostas SET vendedor_id = NULL WHERE vendedor_id = $1`, [id]);
    await query(`DELETE FROM crm_metas WHERE vendedor_id = $1`, [id]);

    // Excluir vendedor permanentemente
    const result = await query(
      `DELETE FROM crm_vendedores WHERE id = $1 RETURNING id`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Vendedor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vendedor excluído com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir vendedor:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir vendedor' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
