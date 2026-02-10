/**
 * Busca Fuzzy - Sistema Comercial PILI
 *
 * Funções para normalização de nomes e busca por similaridade,
 * portadas do sistema CRM Google Sheets.
 */

// ==================== NORMALIZAÇÃO ====================

/**
 * Normaliza nome para comparação:
 * - Remove acentos
 * - Converte para maiúsculas
 * - Remove espaços extras
 * - Remove caracteres especiais
 */
export function normalizarNome(nome: string): string {
  if (!nome) return '';
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove especiais
    .replace(/\s+/g, ' ') // Normaliza espaços
    .trim();
}

// ==================== SIMILARIDADE ====================

/**
 * Calcula distância de Levenshtein entre duas strings
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // deleção
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcula similaridade entre duas strings (0 a 1)
 * 1 = idênticos, 0 = totalmente diferentes
 */
export function calcularSimilaridade(a: string, b: string): number {
  const na = normalizarNome(a);
  const nb = normalizarNome(b);

  if (na === nb) return 1;
  if (!na || !nb) return 0;

  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;

  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

/**
 * Verifica se o termo está contido no texto (busca parcial normalizada)
 */
export function contemTermo(texto: string, termo: string): boolean {
  return normalizarNome(texto).includes(normalizarNome(termo));
}

// ==================== BUSCA FUZZY ====================

interface ClienteFuzzy {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  [key: string]: unknown;
}

interface ResultadoFuzzy<T> {
  item: T;
  similaridade: number;
  campo_match: string;
}

/**
 * Busca clientes por similaridade de nome
 * Retorna matches ordenados por relevância (maior similaridade primeiro)
 */
export function buscarClienteFuzzy<T extends ClienteFuzzy>(
  termo: string,
  clientes: T[],
  threshold = 0.5
): ResultadoFuzzy<T>[] {
  const resultados: ResultadoFuzzy<T>[] = [];

  for (const cliente of clientes) {
    // Comparar com razao_social
    const simRazao = calcularSimilaridade(termo, cliente.razao_social || '');
    // Comparar com nome_fantasia
    const simFantasia = calcularSimilaridade(termo, cliente.nome_fantasia || '');
    // Busca parcial (contém o termo)
    const contemRazao = contemTermo(cliente.razao_social || '', termo);
    const contemFantasia = contemTermo(cliente.nome_fantasia || '', termo);

    // Pega a melhor similaridade
    let melhorSim = Math.max(simRazao, simFantasia);
    let campoMatch = simRazao >= simFantasia ? 'razao_social' : 'nome_fantasia';

    // Se contém o termo, garantir score mínimo de 0.7
    if (contemRazao || contemFantasia) {
      melhorSim = Math.max(melhorSim, 0.7);
      campoMatch = contemRazao ? 'razao_social' : 'nome_fantasia';
    }

    if (melhorSim >= threshold) {
      resultados.push({
        item: cliente,
        similaridade: melhorSim,
        campo_match: campoMatch,
      });
    }
  }

  // Ordena por similaridade (maior primeiro)
  resultados.sort((a, b) => b.similaridade - a.similaridade);

  return resultados;
}

/**
 * Detecta possíveis duplicatas numa lista de clientes
 * Retorna pares de clientes com alta similaridade
 */
export function detectarDuplicatas<T extends ClienteFuzzy>(
  clientes: T[],
  threshold = 0.85
): Array<{ clienteA: T; clienteB: T; similaridade: number }> {
  const duplicatas: Array<{ clienteA: T; clienteB: T; similaridade: number }> = [];

  for (let i = 0; i < clientes.length; i++) {
    for (let j = i + 1; j < clientes.length; j++) {
      const simRazao = calcularSimilaridade(
        clientes[i].razao_social,
        clientes[j].razao_social
      );
      const simFantasia = calcularSimilaridade(
        clientes[i].nome_fantasia || '',
        clientes[j].nome_fantasia || ''
      );
      // Também verificar CNPJ idêntico
      const cnpjA = clientes[i].cpf_cnpj;
      const cnpjB = clientes[j].cpf_cnpj;
      const mesmoCnpj = !!(cnpjA && cnpjB &&
        cnpjA.replace(/\D/g, '') === cnpjB.replace(/\D/g, ''));

      const melhorSim = mesmoCnpj ? 1 : Math.max(simRazao, simFantasia);

      if (melhorSim >= threshold) {
        duplicatas.push({
          clienteA: clientes[i],
          clienteB: clientes[j],
          similaridade: melhorSim,
        });
      }
    }
  }

  duplicatas.sort((a, b) => b.similaridade - a.similaridade);
  return duplicatas;
}
