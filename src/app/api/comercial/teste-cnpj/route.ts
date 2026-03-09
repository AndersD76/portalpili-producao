import { NextRequest, NextResponse } from 'next/server';

// Endpoint de teste - acessar via browser: /api/comercial/teste-cnpj?cnpj=77294254000194
export async function GET(request: NextRequest) {
  const cnpj = request.nextUrl.searchParams.get('cnpj') || '77294254000194';
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  const resultados: Record<string, any> = { cnpj: cnpjLimpo, timestamp: new Date().toISOString() };

  // Testar cada API individualmente
  const apis = [
    { nome: 'BrasilAPI', url: `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}` },
    { nome: 'ReceitaWS', url: `https://receitaws.com.br/v1/cnpj/${cnpjLimpo}` },
    { nome: 'CNPJ.ws', url: `https://publica.cnpj.ws/cnpj/${cnpjLimpo}` },
    { nome: 'CNPJA', url: `https://open.cnpja.com/office/${cnpjLimpo}` },
  ];

  for (const api of apis) {
    const inicio = Date.now();
    try {
      const res = await fetch(api.url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'Accept': 'application/json' },
      });
      const tempo = Date.now() - inicio;

      if (res.ok) {
        const data = await res.json();
        resultados[api.nome] = {
          status: res.status,
          ok: true,
          tempo_ms: tempo,
          razao_social: data.razao_social || data.nome || data.company?.name || 'N/A',
        };
      } else {
        const body = await res.text().catch(() => '');
        resultados[api.nome] = {
          status: res.status,
          ok: false,
          tempo_ms: tempo,
          body: body.substring(0, 200),
        };
      }
    } catch (e) {
      resultados[api.nome] = {
        ok: false,
        erro: e instanceof Error ? e.message : String(e),
        tempo_ms: Date.now() - inicio,
      };
    }
  }

  return NextResponse.json(resultados, { status: 200 });
}
