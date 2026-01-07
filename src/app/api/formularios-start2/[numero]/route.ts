import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verificarNaoConformidade } from '@/lib/naoConformidade';

// POST - Salvar formulário de Reunião de Start 2 (sem alterar status da atividade)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const client = await pool.connect();

  try {
    const { numero } = await params;
    const body = await request.json();
    const {
      atividade_id,
      dados_formulario,
      preenchido_por
    } = body;

    // Validações
    if (!dados_formulario) {
      return NextResponse.json(
        { success: false, error: 'Dados do formulário são obrigatórios' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Inserir formulário de Reunião de Start 2
    const formularioResult = await client.query(`
      INSERT INTO formularios_preenchidos (
        atividade_id,
        numero_opd,
        tipo_formulario,
        dados_formulario,
        anexos,
        preenchido_por,
        data_preenchimento,
        created,
        updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      atividade_id || null,
      numero,
      'REUNIAO_START_2',
      JSON.stringify(dados_formulario),
      null,
      preenchido_por || 'Sistema',
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    // Verificar e marcar não-conformidade
    if (atividade_id) {
      await verificarNaoConformidade(atividade_id, dados_formulario);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: formularioResult.rows[0],
      message: 'Formulário de Reunião de Start 2 salvo com sucesso'
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao salvar formulário de Reunião de Start 2:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar formulário de Reunião de Start 2' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// GET - Buscar formulário de Reunião de Start 2 por atividade_id ou numero_opd
export async function GET(
  request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  try {
    const { numero } = await params;
    const { searchParams } = new URL(request.url);
    const atividadeId = searchParams.get('atividade_id');

    let query = `
      SELECT * FROM formularios_preenchidos
      WHERE tipo_formulario = 'REUNIAO_START_2'
    `;
    const queryParams: any[] = [];

    if (atividadeId) {
      query += ` AND atividade_id = $1`;
      queryParams.push(parseInt(atividadeId));
    } else {
      query += ` AND numero_opd = $1`;
      queryParams.push(numero);
    }

    query += ` ORDER BY created DESC LIMIT 1`;

    const result = await pool.query(query, queryParams);

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
    console.error('Erro ao buscar formulário de Reunião de Start 2:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar formulário de Reunião de Start 2' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
