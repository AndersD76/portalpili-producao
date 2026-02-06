import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarPermissao } from '@/lib/auth';

export async function GET() {
  // Verificar permissão de visualização no módulo ADMIN
  const auth = await verificarPermissao('ADMIN', 'visualizar');
  if (!auth.permitido) return auth.resposta;

  try {
    const result = await query(
      `SELECT
        id,
        codigo,
        nome,
        descricao,
        icone,
        rota,
        ordem,
        ativo
      FROM modulos
      WHERE ativo = true
      ORDER BY ordem`
    );

    return NextResponse.json({
      success: true,
      data: result?.rows || [],
    });
  } catch (error) {
    console.error('Erro ao buscar módulos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar módulos' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
