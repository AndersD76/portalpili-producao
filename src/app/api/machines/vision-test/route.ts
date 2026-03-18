import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const visionUrl = process.env.PILI_VISION_URL || 'NOT SET';
  const apiKey = process.env.PILI_VISION_API_KEY ? 'SET' : 'NOT SET';

  const result: Record<string, unknown> = {
    pili_vision_url: visionUrl,
    api_key_configured: apiKey,
  };

  // Try to connect to the vision engine
  try {
    const res = await fetch(`${visionUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    result.health = data;
    result.connection = 'OK';
  } catch (err) {
    result.connection = 'FAILED';
    result.error = String(err);
  }

  return NextResponse.json(result);
}
