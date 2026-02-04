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
        a.*,
        a.vendedor_id as responsavel_id,
        a.data_agendada as data_limite,
        CASE WHEN a.status = 'CONCLUIDA' THEN true ELSE false END as concluida,
        o.titulo as oportunidade_titulo,
        o.estagio as oportunidade_estagio,
        COALESCE(a.cliente_id, o.cliente_id) as cliente_id,
        c.razao_social as cliente_nome,
        v.nome as responsavel_nome,
        v.nome as vendedor_nome,
        v.email as responsavel_email
      FROM crm_atividades a
      LEFT JOIN crm_oportunidades o ON a.oportunidade_id = o.id
      LEFT JOIN crm_clientes c ON COALESCE(a.cliente_id, o.cliente_id) = c.id
      LEFT JOIN crm_vendedores v ON a.vendedor_id = v.id
      WHERE a.id = $1`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar atividade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar atividade' },
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
      tipo,
      titulo,
      descricao,
      data_agendada,
      data_limite,
      vendedor_id,
      responsavel_id,
      status,
      concluida,
      observacoes,
    } = body;

    // Mapeia campos antigos para novos
    const dataAtividade = data_agendada || data_limite;
    const idVendedor = vendedor_id || responsavel_id;

    // Mapeia concluida (boolean) para status (varchar)
    let statusFinal = status;
    if (concluida === true) {
      statusFinal = 'CONCLUIDA';
    } else if (concluida === false) {
      statusFinal = 'PENDENTE';
    }

    const result = await query(
      `UPDATE crm_atividades SET
        tipo = COALESCE($2, tipo),
        titulo = COALESCE($3, titulo),
        descricao = COALESCE($4, descricao),
        data_agendada = COALESCE($5, data_agendada),
        vendedor_id = COALESCE($6, vendedor_id),
        status = COALESCE($7, status),
        observacoes = COALESCE($8, observacoes),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *, vendedor_id as responsavel_id, data_agendada as data_limite,
        CASE WHEN status = 'CONCLUIDA' THEN true ELSE false END as concluida`,
      [id, tipo, titulo, descricao, dataAtividade, idVendedor, statusFinal, observacoes]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    // Se concluiu, registra interação (se houver oportunidade)
    if (statusFinal === 'CONCLUIDA' && result.rows[0].oportunidade_id) {
      await query(
        `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
         VALUES ($1, $2, $3)`,
        [
          result.rows[0].oportunidade_id,
          result.rows[0].tipo,
          `Atividade concluída: ${result.rows[0].titulo}`,
        ]
      ).catch(() => {}); // Ignora erros se a tabela não existir
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Atividade atualizada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar atividade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar atividade' },
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

    const result = await query(
      `DELETE FROM crm_atividades WHERE id = $1 RETURNING id, oportunidade_id, titulo`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    // Registra exclusão
    await query(
      `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
       VALUES ($1, 'ANOTACAO', $2)`,
      [result.rows[0].oportunidade_id, `Atividade excluída: ${result.rows[0].titulo}`]
    );

    return NextResponse.json({
      success: true,
      message: 'Atividade excluída com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir atividade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir atividade' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
