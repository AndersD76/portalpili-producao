/**
 * Módulo Comercial PILI
 *
 * Exporta todas as funcionalidades do sistema comercial:
 * - Precificador: Cálculo dinâmico de preços
 * - Regras: Motor de regras condicionais
 * - CNPJ: Consulta e enriquecimento de dados
 * - IA: Integração com Claude para assistência inteligente
 */

// Precificador - Cálculo de preços configuráveis
export {
  carregarPrecos,
  invalidarCachePrecos,
  buscarPrecoBase,
  buscarOpcionaisPorCategoria,
  buscarOpcionaisDisponiveis,
  buscarDescontosAplicaveis,
  calcularPreco,
  simularCenarios,
  gerarCamposProposta,
  reajustarPrecosBase,
  reajustarOpcionais,
  type ParametrosCalculo,
} from './precificador';

// Regras - Motor de regras condicionais
export {
  processarRegras,
  validarProposta,
  obterOpcoesDisponiveis,
  validarCNPJ,
  validarEmail,
  validarTelefone,
  type RegraCondicional,
  type ResultadoRegras,
} from './regras';

// CNPJ - Consulta e enriquecimento
export {
  consultarCNPJ,
  enriquecerCliente,
  limparCNPJ,
  formatarCNPJ,
  validarCNPJCompleto,
  limparCache as limparCacheCNPJ,
  invalidarCacheCNPJ,
} from './cnpj';

// IA - Integração com Claude
export {
  analisarCliente,
  gerarSugestoes,
  gerarEmail,
  tratarObjecao,
  sugerirPreenchimento,
  analisarProposta,
  chatAssistente,
  buscarTemplates,
  aplicarTemplate,
  registrarFeedback,
  obterEstatisticas,
} from './ia';

// Fuzzy Match - Busca inteligente por similaridade
export {
  normalizarNome,
  calcularSimilaridade,
  contemTermo,
  buscarClienteFuzzy,
  detectarDuplicatas,
} from './fuzzyMatch';

// Follow-up - Automação de acompanhamento
export {
  gerarFollowUp,
  buscarOportunidadesSemFollowUp,
} from './followup';
