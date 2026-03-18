// SINPROD Integration via API Intermediária
// A API local (sinprod-api/) roda na rede da fábrica e conecta ao Firebird
// Portal Pili (Railway) chama a API via HTTP

// Interfaces para os dados do SINPROD
export interface SinprodOPD {
  NUMERO: string;
  CLIENTE: string;
  CNPJ_CLIENTE: string;
  PRODUTO: string;
  CODIGO_PRODUTO: string;
  DATA_EMISSAO: Date;
  DATA_ENTREGA: Date;
  STATUS: string;
  OBSERVACAO: string;
}

export interface SinprodCliente {
  CODIGO: string;
  NOME: string;
  CNPJ: string;
  ENDERECO: string;
  CIDADE: string;
  UF: string;
  TELEFONE: string;
  EMAIL: string;
}

export interface SinprodProduto {
  CODIGO: string;
  DESCRICAO: string;
  UNIDADE: string;
  NCM: string;
}

// Configuração da API intermediária
const SINPROD_API_URL = process.env.SINPROD_API_URL; // ex: http://192.168.1.100:3333
const SINPROD_API_KEY = process.env.SINPROD_API_KEY || 'pili-sinprod-2026';

async function sinprodFetch<T>(path: string): Promise<T> {
  if (!SINPROD_API_URL) {
    throw new Error(
      'SINPROD_API_URL não configurado. Configure a variável de ambiente apontando para a API local (ex: http://192.168.1.100:3333)'
    );
  }

  const url = `${SINPROD_API_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'X-API-Key': SINPROD_API_KEY,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000), // 10s timeout
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as Record<string, string>).error || `SinProd API retornou ${res.status}`);
  }

  const json = await res.json() as { success: boolean; data: T; error?: string };
  if (!json.success) {
    throw new Error(json.error || 'Erro desconhecido na API SinProd');
  }

  return json.data;
}

export async function buscarOPDsSinprod(): Promise<SinprodOPD[]> {
  return sinprodFetch<SinprodOPD[]>('/api/opds');
}

export async function buscarOPDPorNumero(numero: string): Promise<SinprodOPD | null> {
  try {
    return await sinprodFetch<SinprodOPD>(`/api/opds/${encodeURIComponent(numero)}`);
  } catch {
    return null;
  }
}

export async function buscarClientesSinprod(): Promise<SinprodCliente[]> {
  return sinprodFetch<SinprodCliente[]>('/api/clientes');
}

export async function buscarProdutosSinprod(): Promise<SinprodProduto[]> {
  return sinprodFetch<SinprodProduto[]>('/api/produtos');
}

export async function testFirebirdConnection(): Promise<{ success: boolean; message: string }> {
  if (!SINPROD_API_URL) {
    return {
      success: false,
      message: 'SINPROD_API_URL não configurado. Defina a URL da API intermediária local.',
    };
  }

  try {
    const res = await fetch(`${SINPROD_API_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json() as { status: string; firebird: string };

    if (data.status === 'ok') {
      return { success: true, message: `Conectado via API em ${SINPROD_API_URL}` };
    }
    return { success: false, message: `API respondeu mas Firebird falhou: ${data.firebird}` };
  } catch (err) {
    return {
      success: false,
      message: `Não foi possível conectar na API: ${err instanceof Error ? err.message : 'erro desconhecido'}`,
    };
  }
}
