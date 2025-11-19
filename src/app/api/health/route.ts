import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      checks: {
        jwt_secret: !!process.env.JWT_SECRET,
        database_url: !!process.env.DATABASE_URL,
        database_connection: false,
        database_usuarios_table: false,
      },
      errors: [] as string[],
    };

    // Test database connection
    try {
      const result = await pool.query('SELECT NOW()');
      checks.checks.database_connection = true;

      // Test usuarios table
      const tableCheck = await pool.query(`
        SELECT COUNT(*) as count FROM usuarios WHERE ativo = TRUE
      `);
      checks.checks.database_usuarios_table = true;

    } catch (dbError: any) {
      checks.errors.push(`Database error: ${dbError.message}`);
    }

    const allChecksPass = Object.values(checks.checks).every(v => v === true);

    return NextResponse.json({
      status: allChecksPass ? 'healthy' : 'unhealthy',
      ...checks,
    }, {
      status: allChecksPass ? 200 : 503
    });

  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, {
      status: 500
    });
  }
}

export const dynamic = 'force-dynamic';
