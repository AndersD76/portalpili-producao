/**
 * Google Sheets Integration - Portal PILI
 *
 * Lê dados de planilhas Google Sheets públicas via exportação CSV.
 * A planilha deve estar compartilhada como "Qualquer pessoa com o link".
 */

// ==================== CONFIGURAÇÃO ====================

const SPREADSHEET_ID = '1-rxFnIAOFtg-sx0LN6NMLCrFGGcy0qE7ONTr4iTxSC4';
const PROPOSTAS_GID = '1005054371';

function buildExportUrl(gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

// ==================== CSV PARSER ====================

function parseCSV(text: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines = parseCSVLines(text);

  if (lines.length < 2) return rows;

  const headers = lines[0];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (!values || values.length === 0 || (values.length === 1 && !values[0])) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim();
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Parse CSV respeitando aspas e quebras de linha dentro de campos
 */
function parseCSVLines(text: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        currentField = '';
        result.push(currentRow);
        currentRow = [];
        i++; // skip \n
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        result.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  // Last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    result.push(currentRow);
  }

  return result;
}

// ==================== MAPEAMENTO DE COLUNAS ====================

export interface PropostaSheet {
  situacao: string;
  timestamp: string;
  numero_proposta: string;
  tipo_produto: string;
  vendedor_nome: string;
  cliente_razao_social: string;
  cliente_pais: string;
  cliente_estado: string;
  cliente_cidade: string;
  cliente_regiao: string;
  vendedor_email: string;
  cliente_cnpj: string;
  cliente_contato: string;
  prazo_entrega: string;
  data_visita: string;
  validade_proposta: string;
  probabilidade: string;
  valor_equipamento_tombador: string;
  valor_total_tombador: string;
  valor_equipamento_coletor: string;
  valor_total_coletor: string;
  valor_total_geral: string;
  forma_pagamento: string;
  forma_pagamento_coletor: string;
  observacoes: string;
  observacoes_coletor: string;
  tipo_frete: string;
  garantia_meses: string;
  // Campos técnicos tombador
  tamanho_tombador: string;
  tipo_tombador: string;
  angulo_inclinacao: string;
  voltagem: string;
  frequencia: string;
  // Campos técnicos coletor
  tipo_coletor: string;
  grau_rotacao: string;
  comprimento_trilhos_coletor: string;
  // Status de fechamento
  situacao_proposta: string;
  situacao_fechada: string;
  data_entrega: string;
  motivo_perda: string;
  justificativa_perda: string;
  concorrente: string;
  // Todos os dados brutos
  dados_completos: Record<string, string>;
}

function mapRowToProposta(row: Record<string, string>): PropostaSheet {
  return {
    situacao: row['Situação'] || '',
    timestamp: row['Carimbo de data/hora'] || '',
    numero_proposta: row['Número da proposta'] || '',
    tipo_produto: row['Produto:'] || '',
    vendedor_nome: row['Vendedor e/ou Representante (Nome e Sobrenome):'] || '',
    cliente_razao_social: row['Razão Social do Cliente:'] || '',
    cliente_pais: row['País (onde será instalado o equipamento):'] || '',
    cliente_estado: row['Estado (onde será instalado o equipamento):'] || '',
    cliente_cidade: row['Município (onde será instalado o equipamento):'] || '',
    cliente_regiao: row['Região:'] || '',
    vendedor_email: row['E-mail do Vendedor/Representante:'] || '',
    cliente_cnpj: row['CPF/CNPJ/RUC do Cliente:'] || '',
    cliente_contato: row['E-mail, telefone e/ou whatsApp do Cliente:'] || '',
    prazo_entrega: row['Prazo de entrega (dias):'] || '',
    data_visita: row['Data da visita ao Cliente:'] || '',
    validade_proposta: row['Validade da proposta (em dias):'] || '',
    probabilidade: row['Chance do negócio se concretizar:'] || '',
    valor_equipamento_tombador: row['Preço do equipamento (R$) (TOMBADOR):'] || '',
    valor_total_tombador: row['TOTAL GERAL (R$):'] || '',
    valor_equipamento_coletor: row['Preço do equipamento (R$) (COLETOR):'] || '',
    valor_total_coletor: row['TOTAL GERAL (COLETOR) R$:'] || '',
    valor_total_geral: row['VALOR TOTAL DE PROPOSTAS'] || '',
    forma_pagamento: row['Detalhe a forma de pagamento (digitação livre):'] || '',
    forma_pagamento_coletor: row['Detalhe a forma de pagamento do coletor (digitação livre):'] || '',
    observacoes: row['Descreva (digitação livre) (TOMBADOR):'] || '',
    observacoes_coletor: row['Descreva (digitação livre) (COLETOR):'] || '',
    tipo_frete: row['Tipo de frete:'] || row['Tipo de frete para o cliente (COLETOR):'] || '',
    garantia_meses: row['Tempo de garantia (em meses):'] || row['Tempo de garantia (em meses) do coletor:'] || '',
    tamanho_tombador: row['Tamanho do tombador:'] || '',
    tipo_tombador: row['Tipo:'] || '',
    angulo_inclinacao: row['Ângulo de inclinação:'] || '',
    voltagem: row['Voltagem dos motores (V):'] || row['Voltagem do motor (V) do coletor:'] || '',
    frequencia: row['Frequência dos motores (Hz):'] || row['Frequência do motor (Hz) do coletor:'] || '',
    tipo_coletor: row['Tipo de coletor:'] || '',
    grau_rotacao: row['Grau de rotação do coletor:'] || '',
    comprimento_trilhos_coletor: row['Comprimento dos trilhos do coletor:'] || '',
    situacao_proposta: row['Situação da proposta:'] || '',
    situacao_fechada: row['Situação da proposta fechada:'] || '',
    data_entrega: row['Data da entrega:'] || '',
    motivo_perda: row['Motivo que levou o cliente a não fechar a proposta:'] || '',
    justificativa_perda: row['Justificativa da perda da proposta:'] || '',
    concorrente: row['Cliente fechou com o concorrente:'] || '',
    dados_completos: row,
  };
}

// ==================== MAPEAMENTO SITUAÇÃO → ESTÁGIO ====================

export function mapSituacaoToEstagio(situacao: string): { estagio: string; status: string } {
  const s = situacao.trim().toUpperCase();
  switch (s) {
    case 'EM NEGOCIAÇÃO':
      return { estagio: 'EM_NEGOCIACAO', status: 'ABERTA' };
    case 'EM ANÁLISE':
      return { estagio: 'EM_ANALISE', status: 'ABERTA' };
    case 'FECHADA':
      return { estagio: 'FECHADA', status: 'GANHA' };
    case 'PERDIDA':
      return { estagio: 'PERDIDA', status: 'PERDIDA' };
    case 'SUSPENSO':
    case 'SUSPENSA':
      return { estagio: 'SUSPENSO', status: 'SUSPENSA' };
    case 'SUBSTITUÍDO':
    case 'SUBSTITUIDA':
      return { estagio: 'SUBSTITUIDO', status: 'ABERTA' };
    case 'ABERTA':
    case '':
      return { estagio: 'PROPOSTA', status: 'ABERTA' };
    default:
      return { estagio: 'PROPOSTA', status: 'ABERTA' };
  }
}

// ==================== FUNÇÕES PÚBLICAS ====================

/**
 * Busca todas as propostas da planilha Google Sheets
 */
export async function fetchPropostasFromSheet(): Promise<PropostaSheet[]> {
  const url = buildExportUrl(PROPOSTAS_GID);

  const response = await fetch(url, {
    headers: {
      'Accept': 'text/csv',
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Erro ao acessar planilha: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const rows = parseCSV(text);

  return rows
    .filter(row => row['Carimbo de data/hora']) // Ignorar linhas vazias
    .map(mapRowToProposta);
}

/**
 * Parse valor monetário brasileiro (R$ 1.234,56 → 1234.56)
 */
export function parseValorBR(valor: string): number | null {
  if (!valor) return null;
  const limpo = valor.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? null : num;
}

/**
 * Parse data brasileira (DD/MM/YYYY HH:MM:SS → Date)
 */
export function parseDataBR(data: string): Date | null {
  if (!data) return null;
  // Formato: DD/MM/YYYY HH:MM:SS
  const match = data.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(\d{2})?:?(\d{2})?:?(\d{2})?/);
  if (!match) return null;
  const [, dia, mes, ano, hora, min, seg] = match;
  return new Date(
    parseInt(ano),
    parseInt(mes) - 1,
    parseInt(dia),
    parseInt(hora || '0'),
    parseInt(min || '0'),
    parseInt(seg || '0')
  );
}

/**
 * Parse probabilidade (ex: "7 - PROVÁVEL" → 70)
 */
export function parseProbabilidade(prob: string): number | null {
  if (!prob) return null;
  const match = prob.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1]) * 10; // 1-10 scale → 10-100%
}
