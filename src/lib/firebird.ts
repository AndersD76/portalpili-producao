// SINPROD Integration - Firebird Database
// Nota: node-firebird removido temporariamente devido a problemas de build no Railway
// A integração será feita via API intermediária quando disponível

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

const SINPROD_ERROR = 'Integração SINPROD não disponível. Configure uma API intermediária no servidor local.';

// Funções placeholder - retornam erro indicando que SINPROD não está disponível
export async function buscarOPDsSinprod(): Promise<SinprodOPD[]> {
  throw new Error(SINPROD_ERROR);
}

export async function buscarOPDPorNumero(numero: string): Promise<SinprodOPD | null> {
  throw new Error(SINPROD_ERROR);
}

export async function buscarClientesSinprod(): Promise<SinprodCliente[]> {
  throw new Error(SINPROD_ERROR);
}

export async function buscarProdutosSinprod(): Promise<SinprodProduto[]> {
  throw new Error(SINPROD_ERROR);
}

export async function testFirebirdConnection(): Promise<{ success: boolean; message: string }> {
  return {
    success: false,
    message: SINPROD_ERROR
  };
}
