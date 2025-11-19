import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const { numero } = await params;

    const result = await pool.query(`
      SELECT
        id,
        numero_opd,
        atividade,
        responsavel,
        previsao_inicio,
        data_pedido,
        data_inicio,
        data_termino,
        cadastro_opd,
        status,
        status_alt,
        tempo_medio,
        observacoes,
        dias_programados,
        parent_id,
        requer_formulario,
        tipo_formulario,
        formulario_anexo,
        iniciado_por_id,
        iniciado_por_nome,
        iniciado_por_id_funcionario,
        finalizado_por_id,
        finalizado_por_nome,
        finalizado_por_id_funcionario,
        justificativa_reversao,
        dias,
        created,
        updated
      FROM registros_atividades
      WHERE numero_opd = $1
      ORDER BY id ASC
    `, [numero]);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Erro ao buscar atividades:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar atividades' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const { numero } = await params;
    const body = await request.json();
    const {
      atividade,
      responsavel,
      previsao_inicio,
      data_pedido,
      data_inicio,
      data_termino,
      status,
      observacoes,
      dias_programados,
      requer_formulario,
      tipo_formulario,
      formulario_anexo
    } = body;

    if (!atividade || !responsavel) {
      return NextResponse.json(
        { success: false, error: 'Atividade e responsável são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar próximo ID
    const maxIdResult = await pool.query(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM registros_atividades'
    );
    const nextId = maxIdResult.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO registros_atividades (
        id,
        numero_opd,
        atividade,
        responsavel,
        previsao_inicio,
        data_pedido,
        data_inicio,
        data_termino,
        status,
        observacoes,
        dias_programados,
        requer_formulario,
        tipo_formulario,
        formulario_anexo,
        created,
        updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      nextId,
      numero,
      atividade,
      responsavel,
      previsao_inicio || null,
      data_pedido || null,
      data_inicio || null,
      data_termino || null,
      status || 'A REALIZAR',
      observacoes || null,
      dias_programados || 1,
      requer_formulario || false,
      tipo_formulario || null,
      formulario_anexo ? JSON.stringify(formulario_anexo) : null,
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Atividade criada com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar atividade:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar atividade' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
