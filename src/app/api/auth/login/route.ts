import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seu-secret-key-aqui-mude-em-producao';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id_funcionario, senha } = body;

    if (!id_funcionario || !senha) {
      return NextResponse.json(
        { success: false, error: 'ID do funcionário e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const result = await pool.query(`
      SELECT
        id,
        nome,
        email,
        id_funcionario,
        senha_hash,
        cargo,
        departamento,
        ativo,
        is_admin,
        perfil_id
      FROM usuarios
      WHERE id_funcionario = $1 AND ativo = TRUE
    `, [id_funcionario]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const usuario = result.rows[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        id_funcionario: usuario.id_funcionario,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        departamento: usuario.departamento,
        is_admin: usuario.is_admin,
        perfil_id: usuario.perfil_id
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Remover senha_hash do retorno
    delete usuario.senha_hash;

    // Criar resposta com cookie
    const response = NextResponse.json({
      success: true,
      user: usuario,
      token
    });

    // Definir cookie de autenticação
    response.cookies.set('authenticated', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8 // 8 horas
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8 // 8 horas
    });

    return response;
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao realizar login' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
