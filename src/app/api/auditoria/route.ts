import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar registros de auditoria
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const numero_opd = searchParams.get('numero_opd');
    const atividade_id = searchParams.get('atividade_id');
    const usuario_id = searchParams.get('usuario_id');
    const limit = searchParams.get('limit') || '100';

    let query = `
      SELECT
        id,
        atividade_id,
        numero_opd,
        usuario_id,
        usuario_nome,
        usuario_id_funcionario,
        acao,
        status_anterior,
        status_novo,
        data_acao,
        observacoes,
        ip_address,
        user_agent,
        dados_alterados,
        created
      FROM auditoria_atividades
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (numero_opd) {
      query += ` AND numero_opd = $${paramCount}`;
      params.push(numero_opd);
      paramCount++;
    }

    if (atividade_id) {
      query += ` AND atividade_id = $${paramCount}`;
      params.push(parseInt(atividade_id));
      paramCount++;
    }

    if (usuario_id) {
      query += ` AND usuario_id = $${paramCount}`;
      params.push(parseInt(usuario_id));
      paramCount++;
    }

    query += ` ORDER BY data_acao DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount || 0
    });
  } catch (error) {
    console.error('Erro ao buscar auditoria:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar registros de auditoria' },
      { status: 500 }
    );
  }
}

// POST - Criar registro de auditoria
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      atividade_id,
      numero_opd,
      usuario_id,
      usuario_nome,
      usuario_id_funcionario,
      acao,
      status_anterior,
      status_novo,
      observacoes,
      dados_alterados
    } = body;

    // Validações
    if (!atividade_id || !numero_opd || !usuario_id || !usuario_nome || !usuario_id_funcionario || !acao) {
      return NextResponse.json(
        { success: false, error: 'Dados obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Obter IP e User-Agent do request
    const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const user_agent = request.headers.get('user-agent') || null;

    const result = await pool.query(`
      INSERT INTO auditoria_atividades (
        atividade_id,
        numero_opd,
        usuario_id,
        usuario_nome,
        usuario_id_funcionario,
        acao,
        status_anterior,
        status_novo,
        data_acao,
        observacoes,
        ip_address,
        user_agent,
        dados_alterados,
        created
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      atividade_id,
      numero_opd,
      usuario_id,
      usuario_nome,
      usuario_id_funcionario,
      acao,
      status_anterior || null,
      status_novo || null,
      new Date().toISOString(),
      observacoes || null,
      ip_address,
      user_agent,
      dados_alterados ? JSON.stringify(dados_alterados) : null,
      new Date().toISOString()
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar registro de auditoria:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar registro de auditoria' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
