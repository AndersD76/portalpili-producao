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
        dias,
        formulario_anexo,
        responsavel_execucao,
        data_execucao,
        hora_execucao,
        foto_comprovacao,
        parent_id,
        tempo_acumulado_segundos,
        ultimo_inicio,
        logs,
        tem_nao_conformidade,
        created,
        updated
      FROM registros_atividades
      WHERE numero_opd = $1
      ORDER BY previsao_inicio ASC, id ASC
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
      dias,
      formulario_anexo
    } = body;

    if (!atividade || !responsavel) {
      return NextResponse.json(
        { success: false, error: 'Atividade e responsável são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      INSERT INTO registros_atividades (
        numero_opd,
        atividade,
        responsavel,
        previsao_inicio,
        data_pedido,
        data_inicio,
        data_termino,
        status,
        observacoes,
        dias,
        formulario_anexo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      numero,
      atividade,
      responsavel,
      previsao_inicio || null,
      data_pedido || null,
      data_inicio || null,
      data_termino || null,
      status || 'A REALIZAR',
      observacoes || null,
      dias || null,
      formulario_anexo ? JSON.stringify(formulario_anexo) : null
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
