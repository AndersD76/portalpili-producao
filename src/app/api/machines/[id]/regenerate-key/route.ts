import { NextResponse } from 'next/server';
import { verificarPermissao } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/machines/:id/regenerate-key — Generate new API key
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verificarPermissao('PRODUCAO', 'editar');
  if (!auth.permitido) return auth.resposta;

  const { id } = await params;

  try {
    const newKey = crypto.randomBytes(32).toString('hex');

    const result = await query(
      'UPDATE machines SET api_key = $1, updated_at = NOW() WHERE id = $2 RETURNING api_key',
      [newKey, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Máquina não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { api_key: result.rows[0].api_key }
    });
  } catch (error) {
    console.error('[MACHINES] Erro ao regenerar API key:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar nova API key' },
      { status: 500 }
    );
  }
}
