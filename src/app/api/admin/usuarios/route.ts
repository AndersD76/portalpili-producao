import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verificarPermissao } from '@/lib/auth';

export async function GET(request: Request) {
  // Verificar permissão de visualização no módulo ADMIN
  const auth = await verificarPermissao('ADMIN', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const { searchParams } = new URL(request.url);
    const ativo = searchParams.get('ativo');
    const departamento = searchParams.get('departamento');
    const search = searchParams.get('search');

    // Primeiro verifica se as tabelas de permissões existem
    const tabelasCheck = await query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modulos') as modulos_exists,
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'perfis_acesso') as perfis_exists
    `);

    const tabelasExistem = tabelasCheck?.rows?.[0]?.modulos_exists && tabelasCheck?.rows?.[0]?.perfis_exists;

    let sql: string;

    if (tabelasExistem) {
      sql = `
        SELECT
          u.id,
          u.nome,
          u.email,
          u.id_funcionario,
          u.telefone,
          u.role,
          COALESCE(u.cargo, u.role) as cargo,
          u.departamento,
          COALESCE(u.ativo, u.active, true) as ativo,
          COALESCE(u.is_admin, u.role = 'super_admin') as is_admin,
          u.perfil_id,
          u.ultimo_acesso,
          u.avatar_url,
          u.created_at,
          p.nome as perfil_nome,
          p.nivel as perfil_nivel,
          (
            SELECT json_agg(jsonb_build_object(
              'modulo', m.codigo,
              'modulo_nome', m.nome,
              'visualizar', COALESCE(pm.pode_visualizar, (p.permissoes_padrao->m.codigo->>'visualizar')::boolean, false),
              'criar', COALESCE(pm.pode_criar, (p.permissoes_padrao->m.codigo->>'criar')::boolean, false),
              'editar', COALESCE(pm.pode_editar, (p.permissoes_padrao->m.codigo->>'editar')::boolean, false),
              'excluir', COALESCE(pm.pode_excluir, (p.permissoes_padrao->m.codigo->>'excluir')::boolean, false),
              'aprovar', COALESCE(pm.pode_aprovar, (p.permissoes_padrao->m.codigo->>'aprovar')::boolean, false)
            ))
            FROM modulos m
            LEFT JOIN permissoes_modulos pm ON u.id = pm.usuario_id AND m.id = pm.modulo_id
            WHERE m.ativo = true
          ) as permissoes
        FROM usuarios u
        LEFT JOIN perfis_acesso p ON u.perfil_id = p.id
        WHERE 1=1
      `;
    } else {
      sql = `
        SELECT
          u.id,
          u.nome,
          u.email,
          u.id_funcionario,
          u.telefone,
          u.role,
          COALESCE(u.cargo, u.role) as cargo,
          u.departamento,
          COALESCE(u.ativo, u.active, true) as ativo,
          COALESCE(u.is_admin, u.role = 'super_admin') as is_admin,
          u.perfil_id,
          u.ultimo_acesso,
          u.avatar_url,
          u.created_at,
          NULL as perfil_nome,
          NULL as perfil_nivel,
          NULL as permissoes
        FROM usuarios u
        WHERE 1=1
      `;
    }

    const params: unknown[] = [];
    let paramIndex = 1;

    if (ativo !== null && ativo !== '') {
      sql += ` AND COALESCE(u.ativo, u.active, true) = $${paramIndex++}`;
      params.push(ativo === 'true');
    }

    if (departamento) {
      sql += ` AND u.departamento = $${paramIndex++}`;
      params.push(departamento);
    }

    if (search) {
      sql += ` AND (u.nome ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY u.nome`;

    const result = await query(sql, params);

    // Busca departamentos únicos para filtro (se a coluna existir)
    let departamentos: string[] = [];
    try {
      const deptResult = await query(
        `SELECT DISTINCT departamento FROM usuarios WHERE departamento IS NOT NULL ORDER BY departamento`
      );
      departamentos = deptResult?.rows?.map((r) => r.departamento) || [];
    } catch {
      // Coluna departamento não existe
    }

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
      total: result?.rowCount || 0,
      departamentos,
    });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Verificar permissão de criação no módulo ADMIN
  const auth = await verificarPermissao('ADMIN', 'criar');
  if (!auth.permitido) return auth.resposta;

  try {
    const body = await request.json();
    const {
      nome,
      email,
      senha,
      telefone,
      role,
      cargo,
      departamento,
      perfil_id,
      is_admin,
      id_funcionario,
    } = body;

    if (!nome || !email) {
      return NextResponse.json(
        { success: false, error: 'Nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Verifica se já existe por email
    const existingEmail = await query(
      `SELECT id FROM usuarios WHERE email = $1`,
      [email]
    );

    if (existingEmail?.rowCount && existingEmail.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Email já cadastrado' },
        { status: 409 }
      );
    }

    // Verifica se já existe por id_funcionario (se fornecido)
    if (id_funcionario) {
      const existingFunc = await query(
        `SELECT id FROM usuarios WHERE id_funcionario = $1`,
        [id_funcionario]
      );

      if (existingFunc?.rowCount && existingFunc.rowCount > 0) {
        return NextResponse.json(
          { success: false, error: 'ID Funcionário já cadastrado' },
          { status: 409 }
        );
      }
    }

    // Hash da senha (usa senha padrão se não fornecida)
    const senhaParaHash = senha || 'pili@123';
    const password = await bcrypt.hash(senhaParaHash, 10);

    // Verifica quais colunas existem
    const colsCheck = await query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'usuarios' AND column_name IN ('cargo', 'departamento', 'perfil_id', 'is_admin', 'ativo', 'id_funcionario', 'senha_hash')
    `);
    const existingCols = new Set(colsCheck?.rows?.map(r => r.column_name) || []);

    // Monta query dinamicamente baseada nas colunas existentes
    const fields = ['nome', 'email', 'password', 'telefone', 'role', 'active'];
    const values: unknown[] = [nome, email, password, telefone || null, role || 'user', true];

    if (existingCols.has('id_funcionario') && id_funcionario) {
      fields.push('id_funcionario');
      values.push(id_funcionario);
    }
    if (existingCols.has('senha_hash')) {
      fields.push('senha_hash');
      values.push(password);
    }

    if (existingCols.has('cargo')) {
      fields.push('cargo');
      values.push(cargo || null);
    }
    if (existingCols.has('departamento')) {
      fields.push('departamento');
      values.push(departamento || null);
    }
    if (existingCols.has('perfil_id')) {
      fields.push('perfil_id');
      values.push(perfil_id || null);
    }
    if (existingCols.has('is_admin')) {
      fields.push('is_admin');
      values.push(is_admin || false);
    }
    if (existingCols.has('ativo')) {
      fields.push('ativo');
      values.push(true);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `INSERT INTO usuarios (${fields.join(', ')}) VALUES (${placeholders})
       RETURNING id, nome, email, id_funcionario, cargo, departamento, perfil_id, is_admin, ativo, created_at`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Usuário criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
