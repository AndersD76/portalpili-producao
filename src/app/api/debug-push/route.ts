import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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
      SELECT id, endpoint, user_id, user_nome, active, created_at
      FROM push_subscriptions
      ORDER BY created_at DESC
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
        active: row.active,
        created: row.created_at
      })),
      total: result.rowCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
