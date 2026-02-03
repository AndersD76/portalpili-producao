import { NextResponse } from 'next/server';
import { testFirebirdConnection } from '@/lib/firebird';

export async function GET() {
  try {
    const result = await testFirebirdConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: `Erro: ${error.message}`
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
