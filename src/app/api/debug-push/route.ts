import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// POST para limpar todas subscriptions
export async function POST() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });

    await pool.query('UPDATE push_subscriptions SET active = false');
    await pool.end();

    return NextResponse.json({ success: true, message: 'Todas subscriptions desativadas' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });

    // Verificar VAPID
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    // Buscar subscriptions
    const result = await pool.query(`
      SELECT id, endpoint, user_id, user_nome, active
      FROM push_subscriptions
      ORDER BY id DESC
      LIMIT 10
    `);

    await pool.end();

    return NextResponse.json({
      vapid: {
        publicKey: vapidPublic ? `${vapidPublic.substring(0, 20)}...` : 'NÃO CONFIGURADA',
        privateKey: vapidPrivate ? 'CONFIGURADA' : 'NÃO CONFIGURADA'
      },
      subscriptions: result.rows.map(row => ({
        id: row.id,
        endpoint: row.endpoint?.substring(0, 50) + '...',
        user: row.user_nome || row.user_id,
        active: row.active
      })),
      total: result.rowCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
