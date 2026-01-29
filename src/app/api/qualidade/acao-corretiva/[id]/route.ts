import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET - Buscar ação corretiva por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      'SELECT * FROM acoes_corretivas WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ação corretiva não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar ação corretiva:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar ação corretiva' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar ação corretiva
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;
    const body = await request.json();

    // Verificar se existe
    const existingResult = await client.query(
      'SELECT * FROM acoes_corretivas WHERE id = $1',
      [parseInt(id)]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Ação corretiva não encontrada' },
        { status: 404 }
      );
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const updateableFields = [
      'data_abertura', 'data_emissao', 'origem_tipo', 'origem_id', 'origem_descricao',
      'descricao_problema', 'analise_causa_raiz', 'metodo_analise', 'causa_raiz_identificada',
      'acoes', 'verificacao_eficacia', 'data_verificacao', 'responsavel_verificacao',
      'acao_eficaz', 'padronizacao_realizada', 'descricao_padronizacao', 'documentos_atualizados',
      'responsavel_principal', 'responsavel_principal_id', 'equipe', 'prazo_conclusao',
      'data_conclusao', 'status', 'emitente', 'processos_envolvidos', 'causas', 'subcausas',
      'status_acoes', 'anexos', 'falha', 'responsaveis', 'prazo', 'acoes_finalizadas',
      'situacao_final', 'responsavel_analise', 'data_analise', 'evidencias_anexos'
    ];

    // Campos que precisam ser serializados como JSON
    const jsonFields = ['acoes', 'equipe', 'documentos_atualizados', 'processos_envolvidos', 'subcausas', 'anexos', 'evidencias_anexos'];

    for (const field of updateableFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        if (jsonFields.includes(field)) {
          // Se já é string, usar diretamente; se é objeto, serializar
          const value = body[field];
          if (value === null || value === '') {
            values.push(null);
          } else if (typeof value === 'string') {
            values.push(value);
          } else {
            values.push(JSON.stringify(value));
          }
        } else {
          values.push(body[field] === '' ? null : body[field]);
        }
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Adicionar updated
    fields.push(`updated = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    // Adicionar ID no final
    values.push(parseInt(id));

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE acoes_corretivas SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar ação corretiva:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar ação corretiva' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE - Excluir ação corretiva
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  try {
    const { id } = await params;

    await client.query('BEGIN');

    // Remover referências em NCs e reclamações
    await client.query(
      'UPDATE nao_conformidades SET acao_corretiva_id = NULL WHERE acao_corretiva_id = $1',
      [parseInt(id)]
    );
    await client.query(
      'UPDATE reclamacoes_clientes SET acao_corretiva_id = NULL WHERE acao_corretiva_id = $1',
      [parseInt(id)]
    );

    const result = await client.query(
      'DELETE FROM acoes_corretivas WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Ação corretiva não encontrada' },
        { status: 404 }
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Ação corretiva excluída com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao excluir ação corretiva:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao excluir ação corretiva' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export const dynamic = 'force-dynamic';
