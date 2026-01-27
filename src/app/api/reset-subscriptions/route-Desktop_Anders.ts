import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });

    // Desativar TODAS as subscriptions
    const result = await pool.query(`
      UPDATE push_subscriptions SET active = false
    `);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `${result.rowCount} subscriptions desativadas. Agora os usuários precisam se registrar novamente.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Reativar todas as subscriptions
export async function PUT() {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });

    const result = await pool.query(`
      UPDATE push_subscriptions SET active = true
    `);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: `${result.rowCount} subscriptions reativadas.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
