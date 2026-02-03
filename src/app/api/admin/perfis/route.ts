import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT
        id,
        nome,
        descricao,
        nivel,
        permissoes_padrao,
        ativo,
        created_at,
        (SELECT COUNT(*) FROM usuarios WHERE perfil_id = perfis_acesso.id) as total_usuarios
      FROM perfis_acesso
      WHERE ativo = true
      ORDER BY nivel`
    );

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
    });
  } catch (error) {
    console.error('Erro ao buscar perfis:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar perfis' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, descricao, nivel, permissoes_padrao } = body;

    if (!nome || nivel === undefined) {
      return NextResponse.json(
        { success: false, error: 'Nome e nível são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO perfis_acesso (nome, descricao, nivel, permissoes_padrao)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome, descricao, nivel, JSON.stringify(permissoes_padrao || {})]
    );

    return NextResponse.json({
      success: true,
      data: result?.rows[0],
      message: 'Perfil criado com sucesso',
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar perfil:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar perfil' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
