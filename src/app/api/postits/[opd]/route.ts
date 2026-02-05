import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { notificacoes, enviarNotificacaoPush } from '@/lib/notifications';

// GET - Listar post-its de uma OPD
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ opd: string }> }
) {
  try {
    const { opd: opdParam } = await params;
    const opd = decodeURIComponent(opdParam);

    const result = await query(
      `SELECT * FROM postits
       WHERE opd = $1
       ORDER BY prazo ASC, criado_em DESC`,
      [opd]
    );

    return NextResponse.json({
      success: true,
      postits: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar post-its:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar post-its' },
      { status: 500 }
    );
  }
}

// POST - Criar novo post-it
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ opd: string }> }
) {
  try {
    const { opd: opdParam } = await params;
    const opd = decodeURIComponent(opdParam);
    const body = await request.json();
    const { descricao, responsavel, prazo, criado_por } = body;

    // Validar campos obrigatórios
    if (!descricao || !responsavel || !prazo) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: descricao, responsavel, prazo' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO postits (opd, descricao, responsavel, prazo, criado_por, status)
       VALUES ($1, $2, $3, $4, $5, 'pendente')
       RETURNING *`,
      [opd, descricao, responsavel, prazo, criado_por || 'Sistema']
    );

    // Enviar notificação push
    try {
      const usuario = criado_por || 'Sistema';
      await enviarNotificacaoPush(notificacoes.postitSalvo(opd, 'amarelo', descricao, usuario));
    } catch (notifError) {
      console.error('Erro ao enviar notificação:', notifError);
      // Não falha a criação se falhar a notificação
    }

    return NextResponse.json({
      success: true,
      postit: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar post-it:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar post-it' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar post-it
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ opd: string }> }
) {
  try {
    await params; // Just to comply with the signature
    const body = await request.json();
    const { id, descricao, responsavel, prazo, status } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do post-it é obrigatório' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE postits
       SET descricao = COALESCE($1, descricao),
           responsavel = COALESCE($2, responsavel),
           prazo = COALESCE($3, prazo),
           status = COALESCE($4, status),
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [descricao, responsavel, prazo, status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post-it não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      postit: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao atualizar post-it:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar post-it' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir post-it
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ opd: string }> }
) {
  try {
    await params; // Just to comply with the signature
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do post-it é obrigatório' },
        { status: 400 }
      );
    }

    const result = await query(
      'DELETE FROM postits WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post-it não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Post-it excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir post-it:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir post-it' },
      { status: 500 }
    );
  }
}
