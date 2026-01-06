import { NextResponse } from 'next/server';

export async function GET() {
  // Simple health check - always returns 200 if server is running
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    database_configured: !!process.env.DATABASE_URL,
  });
}

export const dynamic = 'force-dynamic';
