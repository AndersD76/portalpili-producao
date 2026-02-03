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
        o.titulo as oportunidade_titulo,
        o.estagio as oportunidade_estagio,
        o.cliente_id,
        c.razao_social as cliente_nome,
        v.nome as responsavel_nome,
        v.email as responsavel_email
      FROM crm_atividades a
      LEFT JOIN crm_oportunidades o ON a.oportunidade_id = o.id
      LEFT JOIN crm_clientes c ON o.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON a.responsavel_id = v.id
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
      data_limite,
      responsavel_id,
      concluida,
      resultado,
      lembrete,
      lembrete_minutos,
    } = body;

    // Se está concluindo, registra data de conclusão
    let conclusaoClause = '';
    if (concluida === true) {
      conclusaoClause = ', data_conclusao = NOW()';
    }

    const result = await query(
      `UPDATE crm_atividades SET
        tipo = COALESCE($2, tipo),
        titulo = COALESCE($3, titulo),
        descricao = COALESCE($4, descricao),
        data_limite = COALESCE($5, data_limite),
        responsavel_id = COALESCE($6, responsavel_id),
        concluida = COALESCE($7, concluida),
        resultado = COALESCE($8, resultado),
        lembrete = COALESCE($9, lembrete),
        lembrete_minutos = COALESCE($10, lembrete_minutos),
        updated_at = NOW()
        ${conclusaoClause}
      WHERE id = $1
      RETURNING *`,
      [id, tipo, titulo, descricao, data_limite, responsavel_id, concluida, resultado, lembrete, lembrete_minutos]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Atividade não encontrada' },
        { status: 404 }
      );
    }

    // Se concluiu, registra interação
    if (concluida === true) {
      await query(
        `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
         VALUES ($1, $2, $3)`,
        [
          result.rows[0].oportunidade_id,
          result.rows[0].tipo,
          `Atividade concluída: ${result.rows[0].titulo}${resultado ? ` - ${resultado}` : ''}`,
        ]
      );
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
