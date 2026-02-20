import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invalidarCachePrecos } from '@/lib/comercial';

const TABELAS_VALIDAS = ['base', 'opcoes', 'descontos', 'regras', 'config', 'categorias'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  try {
    const { tipo, id } = await params;

    if (!TABELAS_VALIDAS.includes(tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo inválido' },
        { status: 400 }
      );
    }

    const tabela = `crm_precos_${tipo}`;
    const result = await query(
      `SELECT * FROM ${tabela} WHERE id = $1`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Busca histórico de alterações
    const historico = await query(
      `SELECT * FROM crm_precos_historico
       WHERE tabela = $1 AND registro_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [tabela, id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      historico: historico?.rows || [],
    });
  } catch (error) {
    console.error('Erro ao buscar preço:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar preço' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  try {
    const { tipo, id } = await params;
    const body = await request.json();
    const { dados, usuario_id, motivo } = body;

    if (!TABELAS_VALIDAS.includes(tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo inválido' },
        { status: 400 }
      );
    }

    const tabela = `crm_precos_${tipo}`;

    // Busca dados atuais para histórico
    const atual = await query(`SELECT * FROM ${tabela} WHERE id = $1`, [id]);
    if (!atual?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Monta query de update dinâmica
    const campos: string[] = [];
    const valores: unknown[] = [];
    let paramIndex = 1;

    for (const [campo, valor] of Object.entries(dados)) {
      if (campo !== 'id' && campo !== 'created_at') {
        campos.push(`${campo} = $${paramIndex++}`);
        valores.push(valor);
      }
    }

    if (campos.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    campos.push(`updated_at = NOW()`);
    valores.push(id);

    const result = await query(
      `UPDATE ${tabela} SET ${campos.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      valores
    );

    // Histórico é registrado automaticamente pelo trigger fn_precos_auditoria()
    // Invalida cache
    invalidarCachePrecos();

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Preço atualizado com sucesso',
    });
  } catch (error: any) {
    console.error('Erro ao atualizar preço:', error);
    return NextResponse.json(
      { success: false, error: `Erro ao atualizar preço: ${error?.message || 'desconhecido'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> }
) {
  try {
    const { tipo, id } = await params;

    if (!TABELAS_VALIDAS.includes(tipo)) {
      return NextResponse.json(
        { success: false, error: 'Tipo inválido' },
        { status: 400 }
      );
    }

    const tabela = `crm_precos_${tipo}`;

    // Soft delete - desativa o registro
    const result = await query(
      `UPDATE ${tabela} SET ativo = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!result?.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Historico registrado automaticamente pelo trigger fn_precos_auditoria()
    // Invalida cache
    invalidarCachePrecos();

    return NextResponse.json({
      success: true,
      message: 'Registro desativado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao desativar preço:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar preço' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
