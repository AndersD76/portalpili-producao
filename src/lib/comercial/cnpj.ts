/**
 * Serviço de Consulta CNPJ - Sistema Comercial PILI
 *
 * Consulta dados de empresas via APIs públicas e enriquece
 * informações para o CRM e propostas comerciais.
 */

import { DadosCNPJ, EnriquecimentoCliente } from '@/types/comercial';

// ==================== CONFIGURAÇÃO ====================

const APIS_CNPJ = {
  // API gratuita - ReceitaWS
  RECEITAWS: 'https://www.receitaws.com.br/v1/cnpj',
  // API alternativa - BrasilAPI
  BRASILAPI: 'https://brasilapi.com.br/api/cnpj/v1',
  // API alternativa - CNPJ.ws
  CNPJWS: 'https://publica.cnpj.ws/cnpj',
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas
const cache = new Map<string, { dados: DadosCNPJ; timestamp: number }>();

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Consulta CNPJ com fallback entre APIs
 */
export async function consultarCNPJ(cnpj: string): Promise<DadosCNPJ | null> {
  const cnpjLimpo = limparCNPJ(cnpj);

  if (!validarFormatoCNPJ(cnpjLimpo)) {
    throw new Error('CNPJ inválido');
  }

  // Verifica cache
  const cached = cache.get(cnpjLimpo);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.dados;
  }

  // Tenta APIs em sequência
  let dados: DadosCNPJ | null = null;

  try {
    dados = await consultarReceitaWS(cnpjLimpo);
  } catch (error) {
    console.log('ReceitaWS falhou, tentando BrasilAPI...');
    try {
      dados = await consultarBrasilAPI(cnpjLimpo);
    } catch (error2) {
      console.log('BrasilAPI falhou, tentando CNPJ.ws...');
      try {
        dados = await consultarCNPJWS(cnpjLimpo);
      } catch (error3) {
        console.error('Todas as APIs falharam:', error3);
        return null;
      }
    }
  }

  if (dados) {
    cache.set(cnpjLimpo, { dados, timestamp: Date.now() });
  }

  return dados;
}

/**
 * Consulta via ReceitaWS
 */
async function consultarReceitaWS(cnpj: string): Promise<DadosCNPJ> {
  const response = await fetch(`${APIS_CNPJ.RECEITAWS}/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`ReceitaWS: ${response.status}`);
  }

  const data = await response.json();

  if (data.status === 'ERROR') {
    throw new Error(data.message || 'CNPJ não encontrado');
  }

  return {
    cnpj: data.cnpj,
    razao_social: data.nome,
    nome_fantasia: data.fantasia || data.nome,
    situacao: data.situacao,
    data_situacao: data.data_situacao,
    tipo: data.tipo,
    porte: data.porte,
    natureza_juridica: data.natureza_juridica,
    cnae_principal: {
      codigo: data.atividade_principal?.[0]?.code || '',
      descricao: data.atividade_principal?.[0]?.text || '',
    },
    cnaes_secundarios: (data.atividades_secundarias || []).map((a: { code: string; text: string }) => ({
      codigo: a.code,
      descricao: a.text,
    })),
    endereco: {
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.municipio,
      estado: data.uf,
      cep: data.cep,
    },
    telefone: data.telefone,
    email: data.email,
    capital_social: parseFloat(data.capital_social?.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
    quadro_societario: (data.qsa || []).map((s: { nome: string; qual: string }) => ({
      nome: s.nome,
      qualificacao: s.qual,
    })),
    data_abertura: data.abertura,
    ultima_atualizacao: new Date().toISOString(),
  };
}

/**
 * Consulta via BrasilAPI
 */
async function consultarBrasilAPI(cnpj: string): Promise<DadosCNPJ> {
  const response = await fetch(`${APIS_CNPJ.BRASILAPI}/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`BrasilAPI: ${response.status}`);
  }

  const data = await response.json();

  return {
    cnpj: data.cnpj,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia || data.razao_social,
    situacao: data.descricao_situacao_cadastral,
    data_situacao: data.data_situacao_cadastral,
    tipo: data.descricao_identificador_matriz_filial,
    porte: data.porte,
    natureza_juridica: data.natureza_juridica,
    cnae_principal: {
      codigo: String(data.cnae_fiscal),
      descricao: data.cnae_fiscal_descricao,
    },
    cnaes_secundarios: (data.cnaes_secundarios || []).map((a: { codigo: number; descricao: string }) => ({
      codigo: String(a.codigo),
      descricao: a.descricao,
    })),
    endereco: {
      logradouro: `${data.descricao_tipo_de_logradouro} ${data.logradouro}`,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.municipio,
      estado: data.uf,
      cep: data.cep,
    },
    telefone: data.ddd_telefone_1,
    email: data.correio_eletronico,
    capital_social: data.capital_social || 0,
    quadro_societario: (data.qsa || []).map((s: { nome_socio: string; qualificacao_socio: string }) => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
    })),
    data_abertura: data.data_inicio_atividade,
    ultima_atualizacao: new Date().toISOString(),
  };
}

/**
 * Consulta via CNPJ.ws
 */
async function consultarCNPJWS(cnpj: string): Promise<DadosCNPJ> {
  const response = await fetch(`${APIS_CNPJ.CNPJWS}/${cnpj}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`CNPJ.ws: ${response.status}`);
  }

  const data = await response.json();

  return {
    cnpj: data.cnpj_raiz + data.cnpj_ordem + data.cnpj_digito_verificador,
    razao_social: data.razao_social,
    nome_fantasia: data.estabelecimento?.nome_fantasia || data.razao_social,
    situacao: data.estabelecimento?.situacao_cadastral,
    data_situacao: data.estabelecimento?.data_situacao_cadastral,
    tipo: data.estabelecimento?.tipo,
    porte: data.porte?.descricao,
    natureza_juridica: data.natureza_juridica?.descricao,
    cnae_principal: {
      codigo: data.estabelecimento?.atividade_principal?.id || '',
      descricao: data.estabelecimento?.atividade_principal?.descricao || '',
    },
    cnaes_secundarios: (data.estabelecimento?.atividades_secundarias || []).map((a: { id: string; descricao: string }) => ({
      codigo: a.id,
      descricao: a.descricao,
    })),
    endereco: {
      logradouro: `${data.estabelecimento?.tipo_logradouro || ''} ${data.estabelecimento?.logradouro || ''}`.trim(),
      numero: data.estabelecimento?.numero,
      complemento: data.estabelecimento?.complemento,
      bairro: data.estabelecimento?.bairro,
      cidade: data.estabelecimento?.cidade?.nome,
      estado: data.estabelecimento?.estado?.sigla,
      cep: data.estabelecimento?.cep,
    },
    telefone: data.estabelecimento?.ddd1 ? `(${data.estabelecimento.ddd1}) ${data.estabelecimento.telefone1}` : undefined,
    email: data.estabelecimento?.email,
    capital_social: parseFloat(data.capital_social || '0'),
    quadro_societario: (data.socios || []).map((s: { nome: string; qualificacao_socio: { descricao: string } }) => ({
      nome: s.nome,
      qualificacao: s.qualificacao_socio?.descricao,
    })),
    data_abertura: data.estabelecimento?.data_inicio_atividade,
    ultima_atualizacao: new Date().toISOString(),
  };
}

// ==================== ENRIQUECIMENTO ====================

/**
 * Enriquece dados do cliente com informações do CNPJ
 */
export async function enriquecerCliente(cnpj: string): Promise<EnriquecimentoCliente | null> {
  const dados = await consultarCNPJ(cnpj);
  if (!dados) return null;

  // Analisa segmento baseado no CNAE
  const segmento = analisarSegmento(dados.cnae_principal?.codigo || '');

  // Analisa porte e potencial
  const potencial = analisarPotencial(dados);

  // Identifica região
  const regiao = identificarRegiao(dados.endereco?.estado || '');

  return {
    dados_cnpj: dados,
    segmento_sugerido: segmento,
    potencial_estimado: potencial.potencial,
    score_credito: potencial.score,
    regiao,
    alertas: gerarAlertas(dados),
    tags_sugeridas: gerarTags(dados, segmento),
    proximo_passo_sugerido: sugerirProximoPasso(dados, potencial),
  };
}

/**
 * Analisa segmento baseado no CNAE
 */
function analisarSegmento(cnae: string): string {
  const cnaePrimario = cnae.substring(0, 2);

  const segmentos: Record<string, string> = {
    '01': 'Agronegócio',
    '02': 'Agronegócio',
    '03': 'Agronegócio',
    '10': 'Alimentos',
    '11': 'Bebidas',
    '20': 'Químico',
    '23': 'Mineração',
    '24': 'Metalurgia',
    '28': 'Máquinas',
    '41': 'Construção',
    '42': 'Infraestrutura',
    '43': 'Construção',
    '46': 'Distribuidor',
    '49': 'Transporte',
    '52': 'Armazenagem',
  };

  return segmentos[cnaePrimario] || 'Outros';
}

/**
 * Analisa potencial e score do cliente
 */
function analisarPotencial(dados: DadosCNPJ): { potencial: 'ALTO' | 'MEDIO' | 'BAIXO'; score: number } {
  let score = 50;

  // Situação cadastral
  if (dados.situacao === 'ATIVA') score += 20;
  else score -= 30;

  // Capital social
  const capital = dados.capital_social || 0;
  if (capital >= 10000000) score += 20;
  else if (capital >= 1000000) score += 10;
  else if (capital >= 100000) score += 5;

  // Porte
  if (dados.porte?.includes('GRANDE')) score += 15;
  else if (dados.porte?.includes('MEDIO') || dados.porte?.includes('MÉDIO')) score += 10;

  // Tempo de empresa
  if (dados.data_abertura) {
    const anos = (new Date().getFullYear() - new Date(dados.data_abertura).getFullYear());
    if (anos >= 10) score += 15;
    else if (anos >= 5) score += 10;
    else if (anos >= 2) score += 5;
  }

  // CNAE relevante para PILI
  const cnaesRelevantes = ['01', '10', '46', '52']; // Agro, alimentos, distribuição, armazenagem
  if (cnaesRelevantes.some(c => dados.cnae_principal?.codigo?.startsWith(c))) {
    score += 15;
  }

  // Normaliza score
  score = Math.max(0, Math.min(100, score));

  // Determina potencial
  let potencial: 'ALTO' | 'MEDIO' | 'BAIXO';
  if (score >= 70) potencial = 'ALTO';
  else if (score >= 40) potencial = 'MEDIO';
  else potencial = 'BAIXO';

  return { potencial, score };
}

/**
 * Identifica região do Brasil
 */
function identificarRegiao(estado: string): string {
  const regioes: Record<string, string> = {
    AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
    AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste',
    PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
    DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
    ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
    PR: 'Sul', RS: 'Sul', SC: 'Sul',
  };

  return regioes[estado] || 'Não identificada';
}

/**
 * Gera alertas sobre o cliente
 */
function gerarAlertas(dados: DadosCNPJ): string[] {
  const alertas: string[] = [];

  if (dados.situacao !== 'ATIVA') {
    alertas.push(`Situação cadastral: ${dados.situacao}`);
  }

  if (!dados.email) {
    alertas.push('Email não disponível no cadastro');
  }

  if (!dados.telefone) {
    alertas.push('Telefone não disponível no cadastro');
  }

  const capital = dados.capital_social || 0;
  if (capital < 50000) {
    alertas.push('Capital social baixo - verificar capacidade de pagamento');
  }

  if (dados.data_abertura) {
    const anos = new Date().getFullYear() - new Date(dados.data_abertura).getFullYear();
    if (anos < 2) {
      alertas.push('Empresa recente (menos de 2 anos)');
    }
  }

  return alertas;
}

/**
 * Gera tags sugeridas para o cliente
 */
function gerarTags(dados: DadosCNPJ, segmento: string): string[] {
  const tags: string[] = [];

  tags.push(segmento);

  if (dados.porte) {
    tags.push(dados.porte.toLowerCase().replace('empresa de ', ''));
  }

  const regiao = identificarRegiao(dados.endereco?.estado || '');
  tags.push(regiao);

  // Tags baseadas no CNAE
  const cnae = dados.cnae_principal?.descricao?.toLowerCase() || '';
  if (cnae.includes('grão') || cnae.includes('cereal')) tags.push('grãos');
  if (cnae.includes('soja')) tags.push('soja');
  if (cnae.includes('milho')) tags.push('milho');
  if (cnae.includes('armazen')) tags.push('armazenagem');
  if (cnae.includes('transport')) tags.push('transporte');

  return [...new Set(tags)];
}

/**
 * Sugere próximo passo baseado na análise
 */
function sugerirProximoPasso(
  dados: DadosCNPJ,
  potencial: { potencial: string; score: number }
): string {
  if (dados.situacao !== 'ATIVA') {
    return 'Verificar situação cadastral antes de prosseguir';
  }

  if (potencial.score >= 70) {
    return 'Cliente de alto potencial - agendar visita presencial';
  }

  if (potencial.score >= 50) {
    return 'Enviar apresentação institucional e catálogo de produtos';
  }

  return 'Qualificar necessidades por telefone antes de investir mais tempo';
}

// ==================== UTILITÁRIOS ====================

/**
 * Remove formatação do CNPJ
 */
export function limparCNPJ(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '');
}

/**
 * Formata CNPJ para exibição
 */
export function formatarCNPJ(cnpj: string): string {
  const limpo = limparCNPJ(cnpj);
  if (limpo.length !== 14) return cnpj;

  return limpo.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Valida formato do CNPJ (apenas formato, não dígitos verificadores)
 */
function validarFormatoCNPJ(cnpj: string): boolean {
  return /^\d{14}$/.test(cnpj);
}

/**
 * Valida CNPJ completo incluindo dígitos verificadores
 */
export function validarCNPJCompleto(cnpj: string): boolean {
  const limpo = limparCNPJ(cnpj);

  if (limpo.length !== 14) return false;
  if (/^(\d)\1+$/.test(limpo)) return false;

  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(limpo.charAt(i)) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (parseInt(limpo.charAt(12)) !== digito) return false;

  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(limpo.charAt(i)) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (parseInt(limpo.charAt(13)) !== digito) return false;

  return true;
}

/**
 * Limpa o cache de CNPJs
 */
export function limparCache(): void {
  cache.clear();
}

/**
 * Remove um CNPJ específico do cache
 */
export function invalidarCacheCNPJ(cnpj: string): void {
  cache.delete(limparCNPJ(cnpj));
}
