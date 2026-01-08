import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST - Registrar nova subscription
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription, userId, userNome } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Subscription inválida' },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    // Verificar se já existe
    const existing = await pool.query(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      // Atualizar subscription existente
      await pool.query(
        `UPDATE push_subscriptions
         SET p256dh = $1, auth = $2, user_id = $3, user_nome = $4, active = true, updated = CURRENT_TIMESTAMP
         WHERE endpoint = $5`,
        [p256dh, auth, userId || null, userNome || null, endpoint]
      );

      return NextResponse.json({
        success: true,
        message: 'Subscription atualizada'
      });
    }

    // Inserir nova subscription
    await pool.query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, user_nome)
       VALUES ($1, $2, $3, $4, $5)`,
      [endpoint, p256dh, auth, userId || null, userNome || null]
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription registrada com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao registrar subscription' },
      { status: 500 }
    );
  }
}

// DELETE - Remover subscription
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint não fornecido' },
        { status: 400 }
      );
    }

    await pool.query(
      'UPDATE push_subscriptions SET active = false WHERE endpoint = $1',
      [endpoint]
    );

    return NextResponse.json({
      success: true,
      message: 'Subscription removida'
    });
  } catch (error) {
    console.error('Erro ao remover subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao remover subscription' },
      { status: 500 }
    );
  }
}

// GET - Verificar status da subscription
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint não fornecido' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT id, active FROM push_subscriptions WHERE endpoint = $1',
      [endpoint]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: true,
        registered: false
      });
    }

    return NextResponse.json({
      success: true,
      registered: true,
      active: result.rows[0].active
    });
  } catch (error) {
    console.error('Erro ao verificar subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar subscription' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
