import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const result = await query(
      `SELECT
        u.id,
        u.nome,
        u.email,
        u.id_funcionario,
        u.cargo,
        u.departamento,
        u.ativo,
        u.is_admin,
        u.perfil_id,
        u.ultimo_acesso,
        u.avatar_url,
        u.created_at,
        p.nome as perfil_nome,
        p.nivel as perfil_nivel,
        (
          SELECT json_agg(jsonb_build_object(
            'modulo_id', m.id,
            'modulo', m.codigo,
            'modulo_nome', m.nome,
            'visualizar', COALESCE(pm.pode_visualizar, (p.permissoes_padrao->m.codigo->>'visualizar')::boolean, false),
            'criar', COALESCE(pm.pode_criar, (p.permissoes_padrao->m.codigo->>'criar')::boolean, false),
            'editar', COALESCE(pm.pode_editar, (p.permissoes_padrao->m.codigo->>'editar')::boolean, false),
            'excluir', COALESCE(pm.pode_excluir, (p.permissoes_padrao->m.codigo->>'excluir')::boolean, false),
            'aprovar', COALESCE(pm.pode_aprovar, (p.permissoes_padrao->m.codigo->>'aprovar')::boolean, false),
            'restricoes', COALESCE(pm.restricoes, '{}')
          ))
          FROM modulos m
          LEFT JOIN permissoes_modulos pm ON u.id = pm.usuario_id AND m.id = pm.modulo_id
          WHERE m.ativo = true
        ) as permissoes
      FROM usuarios u
      LEFT JOIN perfis_acesso p ON u.perfil_id = p.id
      WHERE u.id = $1`,
      [id]
    );

    if (!result?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      nome,
      email,
      id_funcionario,
      senha,
      cargo,
      departamento,
      perfil_id,
      is_admin,
      ativo,
    } = body;

    // Verifica se usuário existe
    const existing = await query(
      `SELECT id FROM usuarios WHERE id = $1`,
      [id]
    );

    if (!existing?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verifica duplicidade de email/id_funcionario
    if (email || id_funcionario) {
      const duplicate = await query(
        `SELECT id FROM usuarios WHERE (email = $1 OR id_funcionario = $2) AND id != $3`,
        [email, id_funcionario, id]
      );

      if (duplicate?.rowCount && duplicate.rowCount > 0) {
        return NextResponse.json(
          { success: false, error: 'Email ou ID funcionário já cadastrado para outro usuário' },
          { status: 409 }
        );
      }
    }

    // Monta query de update dinamicamente
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (nome !== undefined) {
      updates.push(`nome = $${paramIndex++}`);
      values.push(nome);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (id_funcionario !== undefined) {
      updates.push(`id_funcionario = $${paramIndex++}`);
      values.push(id_funcionario);
    }
    if (senha) {
      const senha_hash = await bcrypt.hash(senha, 10);
      updates.push(`senha_hash = $${paramIndex++}`);
      values.push(senha_hash);
    }
    if (cargo !== undefined) {
      updates.push(`cargo = $${paramIndex++}`);
      values.push(cargo);
    }
    if (departamento !== undefined) {
      updates.push(`departamento = $${paramIndex++}`);
      values.push(departamento);
    }
    if (perfil_id !== undefined) {
      updates.push(`perfil_id = $${paramIndex++}`);
      // Se perfil_id for 0, null ou vazio, enviar NULL para o banco
      values.push(perfil_id && perfil_id > 0 ? perfil_id : null);
    }
    if (is_admin !== undefined) {
      updates.push(`is_admin = $${paramIndex++}`);
      values.push(is_admin);
    }
    if (ativo !== undefined) {
      updates.push(`ativo = $${paramIndex++}`);
      values.push(ativo);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    values.push(id);

    const result = await query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, nome, email, id_funcionario, cargo, departamento, perfil_id, is_admin, ativo`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Usuário atualizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { success: false, error: `Erro ao atualizar: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Soft delete - apenas desativa
    const result = await query(
      `UPDATE usuarios SET ativo = false WHERE id = $1
       RETURNING id, nome`,
      [id]
    );

    if (!result?.rows?.length) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Usuário ${result.rows[0].nome} desativado com sucesso`,
    });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao desativar usuário' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
