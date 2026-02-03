import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar formulário preenchido por atividade_id (qualquer tipo)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const atividadeId = parseInt(id);

    if (isNaN(atividadeId)) {
      return NextResponse.json({
        success: false,
        error: 'ID de atividade inválido'
      }, { status: 400 });
    }

    // Buscar qualquer formulário associado a esta atividade
    const result = await pool.query(`
      SELECT * FROM formularios_preenchidos
      WHERE atividade_id = $1
      ORDER BY updated DESC
      LIMIT 1
    `, [atividadeId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Formulário não encontrado'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar formulário preenchido:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar formulário preenchido' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
