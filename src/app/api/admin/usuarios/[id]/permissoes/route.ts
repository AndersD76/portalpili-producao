import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Atualiza permissões de um usuário
export async function PUT(request: Request, context: RouteContext) {
  // Verificar permissão de edição no módulo ADMIN
  const auth = await verificarPermissao('ADMIN', 'editar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id: usuarioId } = await context.params;
    const body = await request.json();
    const { permissoes } = body;

    if (!permissoes || !Array.isArray(permissoes)) {
      return NextResponse.json(
        { success: false, error: 'Permissões inválidas' },
        { status: 400 }
      );
    }

    // Verifica se usuário existe
    const userCheck = await query(
      `SELECT id FROM usuarios WHERE id = $1`,
      [usuarioId]
    );

    if (!userCheck?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Atualiza permissões em batch
    for (const perm of permissoes) {
      const {
        modulo_id,
        visualizar,
        criar,
        editar,
        excluir,
        aprovar,
        restricoes,
      } = perm;

      // Upsert permissão
      await query(
        `INSERT INTO permissoes_modulos (
          usuario_id, modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir, pode_aprovar, restricoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (usuario_id, modulo_id) DO UPDATE SET
          pode_visualizar = $3,
          pode_criar = $4,
          pode_editar = $5,
          pode_excluir = $6,
          pode_aprovar = $7,
          restricoes = $8,
          updated_at = NOW()`,
        [
          usuarioId,
          modulo_id,
          visualizar ?? true,
          criar ?? false,
          editar ?? false,
          excluir ?? false,
          aprovar ?? false,
          JSON.stringify(restricoes || {}),
        ]
      );
    }

    // Busca permissões atualizadas
    const result = await query(
      `SELECT
        m.id as modulo_id,
        m.codigo as modulo,
        m.nome as modulo_nome,
        pm.pode_visualizar as visualizar,
        pm.pode_criar as criar,
        pm.pode_editar as editar,
        pm.pode_excluir as excluir,
        pm.pode_aprovar as aprovar,
        pm.restricoes
      FROM modulos m
      LEFT JOIN permissoes_modulos pm ON pm.modulo_id = m.id AND pm.usuario_id = $1
      WHERE m.ativo = true
      ORDER BY m.ordem`,
      [usuarioId]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      message: 'Permissões atualizadas com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar permissões' },
      { status: 500 }
    );
  }
}

// Remove todas permissões personalizadas (volta ao perfil padrão)
export async function DELETE(request: Request, context: RouteContext) {
  // Verificar permissão de exclusão no módulo ADMIN
  const auth = await verificarPermissao('ADMIN', 'excluir');
  if (!auth.permitido) return auth.resposta;

  try {
    const { id: usuarioId } = await context.params;

    await query(
      `DELETE FROM permissoes_modulos WHERE usuario_id = $1`,
      [usuarioId]
    );

    return NextResponse.json({
      success: true,
      message: 'Permissões personalizadas removidas. Usuário usará permissões do perfil.',
    });
  } catch (error) {
    console.error('Erro ao remover permissões:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao remover permissões' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
