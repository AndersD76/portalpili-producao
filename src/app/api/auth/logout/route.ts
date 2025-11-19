import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

    // Remover cookies de autenticação
    response.cookies.delete('authenticated');
    response.cookies.delete('auth_token');

    return response;
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao realizar logout' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
