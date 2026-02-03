/**
 * Motor de Regras Condicionais - Sistema Comercial PILI
 *
 * Implementa as regras condicionais da planilha de propostas,
 * determinando campos obrigatórios, opções disponíveis e validações.
 */

import { ProdutoTipo, Proposta } from '@/types/comercial';

// ==================== TIPOS ====================

export interface RegraCondicional {
  id: string;
  nome: string;
  condicao: (proposta: Partial<Proposta>) => boolean;
  acao: 'MOSTRAR' | 'ESCONDER' | 'OBRIGATORIO' | 'OPCIONAL' | 'VALOR' | 'VALIDAR';
  camposAfetados: string[];
  valorPadrao?: unknown;
  mensagemValidacao?: string;
}

export interface ResultadoRegras {
  camposVisiveis: string[];
  camposObrigatorios: string[];
  camposDesabilitados: string[];
  valoresPadrao: Record<string, unknown>;
  errosValidacao: { campo: string; mensagem: string }[];
  alertas: string[];
}

// ==================== REGRAS TOMBADOR ====================

const regrasTombador: RegraCondicional[] = [
  // Comprimento determina modelo
  {
    id: 'TOMB_MODELO_COMPRIMENTO',
    nome: 'Modelo baseado em comprimento',
    condicao: (p) => p.tipo_produto === 'TOMBADOR' && !!p.comprimento,
    acao: 'VALOR',
    camposAfetados: ['modelo'],
    valorPadrao: (p: Partial<Proposta>) => {
      const comp = p.comprimento || 0;
      if (comp <= 12) return 'SIMPLES';
      if (comp <= 18) return 'SIMPLES'; // ou DUPLO dependendo do cliente
      return 'DUPLO';
    },
  },

  // Central Hidráulica obrigatória para tombador
  {
    id: 'TOMB_CENTRAL_HIDRAULICA',
    nome: 'Central Hidráulica para Tombador',
    condicao: (p) => p.tipo_produto === 'TOMBADOR',
    acao: 'MOSTRAR',
    camposAfetados: ['central_hidraulica', 'tipo_central', 'potencia_central'],
  },

  // Tombador >= 21m precisa de estrutura reforçada
  {
    id: 'TOMB_ESTRUTURA_REFORÇADA',
    nome: 'Estrutura reforçada para grandes tombadores',
    condicao: (p) => p.tipo_produto === 'TOMBADOR' && (p.comprimento || 0) >= 21,
    acao: 'OBRIGATORIO',
    camposAfetados: ['estrutura_reforcada'],
    mensagemValidacao: 'Tombadores acima de 21m requerem estrutura reforçada',
  },

  // Tombador com grãos precisa de vedação especial
  {
    id: 'TOMB_VEDACAO_GRAOS',
    nome: 'Vedação para transporte de grãos',
    condicao: (p) => p.tipo_produto === 'TOMBADOR' && p.tipo_carga === 'GRAOS',
    acao: 'OBRIGATORIO',
    camposAfetados: ['vedacao_especial'],
  },

  // Tombador duplo tem opções adicionais
  {
    id: 'TOMB_DUPLO_OPCOES',
    nome: 'Opções para Tombador Duplo',
    condicao: (p) => p.tipo_produto === 'TOMBADOR' && p.modelo === 'DUPLO',
    acao: 'MOSTRAR',
    camposAfetados: [
      'sincronismo_cilindros',
      'sensor_posicao_duplo',
      'comando_sequencial',
    ],
  },

  // Prazo de entrega varia com comprimento
  {
    id: 'TOMB_PRAZO_COMPRIMENTO',
    nome: 'Prazo baseado em comprimento',
    condicao: (p) => p.tipo_produto === 'TOMBADOR',
    acao: 'VALOR',
    camposAfetados: ['prazo_entrega_minimo'],
    valorPadrao: (p: Partial<Proposta>) => {
      const comp = p.comprimento || 0;
      if (comp <= 12) return 45;
      if (comp <= 18) return 60;
      if (comp <= 26) return 75;
      return 90;
    },
  },
];

// ==================== REGRAS COLETOR ====================

const regrasColetor: RegraCondicional[] = [
  // Ângulo determina complexidade
  {
    id: 'COL_ANGULO_COMPLEXIDADE',
    nome: 'Complexidade por ângulo',
    condicao: (p) => p.tipo_produto === 'COLETOR' && !!p.angulo_giro,
    acao: 'VALOR',
    camposAfetados: ['nivel_complexidade'],
    valorPadrao: (p: Partial<Proposta>) => {
      const angulo = p.angulo_giro || 0;
      if (angulo <= 180) return 'BAIXA';
      if (angulo <= 270) return 'MEDIA';
      return 'ALTA';
    },
  },

  // Coletor 360° precisa de componentes especiais
  {
    id: 'COL_360_ESPECIAL',
    nome: 'Componentes especiais para 360°',
    condicao: (p) => p.tipo_produto === 'COLETOR' && p.angulo_giro === 360,
    acao: 'OBRIGATORIO',
    camposAfetados: ['anel_giratório', 'sistema_anti_torção'],
    mensagemValidacao: 'Coletor 360° requer anel giratório e sistema anti-torção',
  },

  // Coletor com sensor de nível
  {
    id: 'COL_SENSOR_NIVEL',
    nome: 'Sensor de nível para silos',
    condicao: (p) => p.tipo_produto === 'COLETOR' && p.aplicacao === 'SILO',
    acao: 'MOSTRAR',
    camposAfetados: ['sensor_nivel', 'tipo_sensor_nivel'],
  },

  // Capacidade mínima por ângulo
  {
    id: 'COL_CAPACIDADE_ANGULO',
    nome: 'Capacidade mínima por ângulo',
    condicao: (p) => p.tipo_produto === 'COLETOR',
    acao: 'VALIDAR',
    camposAfetados: ['capacidade'],
    mensagemValidacao: 'Capacidade incompatível com ângulo selecionado',
  },
];

// ==================== REGRAS GERAIS ====================

const regrasGerais: RegraCondicional[] = [
  // Frete incluso acima de determinado valor
  {
    id: 'GERAL_FRETE_INCLUSO',
    nome: 'Frete incluso em pedidos grandes',
    condicao: (p) => (p.valor_total || 0) >= 500000,
    acao: 'VALOR',
    camposAfetados: ['frete_incluso'],
    valorPadrao: true,
  },

  // Instalação obrigatória para certos estados
  {
    id: 'GERAL_INSTALACAO_ESTADOS',
    nome: 'Instalação para estados distantes',
    condicao: (p) => {
      const estadosDistantes = ['AM', 'PA', 'RR', 'AP', 'AC', 'RO'];
      return estadosDistantes.includes(p.estado_entrega || '');
    },
    acao: 'OBRIGATORIO',
    camposAfetados: ['instalacao_inclusa', 'treinamento_incluso'],
    mensagemValidacao: 'Instalação e treinamento obrigatórios para região Norte',
  },

  // Garantia estendida disponível
  {
    id: 'GERAL_GARANTIA_ESTENDIDA',
    nome: 'Garantia estendida disponível',
    condicao: (p) => (p.valor_total || 0) >= 200000,
    acao: 'MOSTRAR',
    camposAfetados: ['garantia_estendida', 'periodo_garantia_extra'],
  },

  // Desconto por pagamento à vista
  {
    id: 'GERAL_DESCONTO_AVISTA',
    nome: 'Desconto para pagamento à vista',
    condicao: (p) => p.forma_pagamento === 'AVISTA',
    acao: 'VALOR',
    camposAfetados: ['desconto_pagamento'],
    valorPadrao: 5, // 5% de desconto
  },

  // Financiamento BNDES
  {
    id: 'GERAL_BNDES',
    nome: 'Opções de financiamento BNDES',
    condicao: (p) => p.forma_pagamento === 'FINANCIAMENTO',
    acao: 'MOSTRAR',
    camposAfetados: ['linha_bndes', 'prazo_financiamento', 'carencia'],
  },

  // Documentação técnica
  {
    id: 'GERAL_DOC_TECNICA',
    nome: 'Documentação técnica inclusa',
    condicao: () => true,
    acao: 'VALOR',
    camposAfetados: ['manual_operacao', 'certificado_qualidade', 'art_projeto'],
    valorPadrao: true,
  },
];

// ==================== REGRAS DE VALIDAÇÃO ====================

const regrasValidacao: RegraCondicional[] = [
  // CNPJ válido
  {
    id: 'VAL_CNPJ',
    nome: 'CNPJ válido',
    condicao: (p) => !!p.cnpj_cliente && !validarCNPJ(p.cnpj_cliente),
    acao: 'VALIDAR',
    camposAfetados: ['cnpj_cliente'],
    mensagemValidacao: 'CNPJ inválido',
  },

  // Email válido
  {
    id: 'VAL_EMAIL',
    nome: 'Email válido',
    condicao: (p) => !!p.email_contato && !validarEmail(p.email_contato || ''),
    acao: 'VALIDAR',
    camposAfetados: ['email_contato'],
    mensagemValidacao: 'Email inválido',
  },

  // Telefone válido
  {
    id: 'VAL_TELEFONE',
    nome: 'Telefone válido',
    condicao: (p) => !!p.telefone_contato && !validarTelefone(p.telefone_contato || ''),
    acao: 'VALIDAR',
    camposAfetados: ['telefone_contato'],
    mensagemValidacao: 'Telefone inválido',
  },

  // Data de validade futura
  {
    id: 'VAL_DATA_VALIDADE',
    nome: 'Data de validade futura',
    condicao: (p) => {
      if (!p.data_validade) return false;
      return new Date(p.data_validade) <= new Date();
    },
    acao: 'VALIDAR',
    camposAfetados: ['data_validade'],
    mensagemValidacao: 'Data de validade deve ser futura',
  },

  // Desconto máximo
  {
    id: 'VAL_DESCONTO_MAX',
    nome: 'Desconto máximo permitido',
    condicao: (p) => {
      const desconto = (p.valor_desconto || 0) / (p.valor_total || 1) * 100;
      return desconto > 15;
    },
    acao: 'VALIDAR',
    camposAfetados: ['valor_desconto'],
    mensagemValidacao: 'Desconto acima de 15% requer aprovação da diretoria',
  },
];

// ==================== FUNÇÕES DE VALIDAÇÃO ====================

function validarCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, '');

  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (parseInt(cnpj.charAt(12)) !== digito) return false;

  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj.charAt(i)) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  digito = 11 - (soma % 11);
  if (digito > 9) digito = 0;
  if (parseInt(cnpj.charAt(13)) !== digito) return false;

  return true;
}

function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validarTelefone(telefone: string): boolean {
  const numeros = telefone.replace(/[^\d]/g, '');
  return numeros.length >= 10 && numeros.length <= 11;
}

// ==================== MOTOR DE REGRAS ====================

/**
 * Todas as regras do sistema
 */
const todasRegras: RegraCondicional[] = [
  ...regrasTombador,
  ...regrasColetor,
  ...regrasGerais,
  ...regrasValidacao,
];

/**
 * Processa todas as regras para uma proposta
 */
export function processarRegras(proposta: Partial<Proposta>): ResultadoRegras {
  const resultado: ResultadoRegras = {
    camposVisiveis: [],
    camposObrigatorios: [],
    camposDesabilitados: [],
    valoresPadrao: {},
    errosValidacao: [],
    alertas: [],
  };

  // Campos sempre visíveis
  const camposBase = [
    'tipo_produto',
    'cliente_nome',
    'cnpj_cliente',
    'contato_nome',
    'email_contato',
    'telefone_contato',
    'data_proposta',
    'data_validade',
    'forma_pagamento',
    'prazo_entrega',
  ];
  resultado.camposVisiveis.push(...camposBase);

  // Campos sempre obrigatórios
  const obrigatoriosBase = [
    'tipo_produto',
    'cliente_nome',
    'cnpj_cliente',
    'contato_nome',
    'email_contato',
  ];
  resultado.camposObrigatorios.push(...obrigatoriosBase);

  // Adiciona campos específicos por tipo de produto
  if (proposta.tipo_produto === 'TOMBADOR') {
    resultado.camposVisiveis.push(
      'comprimento',
      'modelo',
      'tipo_carga',
      'capacidade_carga',
      'central_hidraulica',
    );
    resultado.camposObrigatorios.push('comprimento', 'modelo');
  } else if (proposta.tipo_produto === 'COLETOR') {
    resultado.camposVisiveis.push(
      'angulo_giro',
      'aplicacao',
      'capacidade',
      'diametro_rosca',
    );
    resultado.camposObrigatorios.push('angulo_giro', 'aplicacao');
  }

  // Processa cada regra
  for (const regra of todasRegras) {
    try {
      if (!regra.condicao(proposta)) continue;

      switch (regra.acao) {
        case 'MOSTRAR':
          resultado.camposVisiveis.push(...regra.camposAfetados);
          break;

        case 'ESCONDER':
          resultado.camposVisiveis = resultado.camposVisiveis.filter(
            c => !regra.camposAfetados.includes(c)
          );
          resultado.camposDesabilitados.push(...regra.camposAfetados);
          break;

        case 'OBRIGATORIO':
          resultado.camposVisiveis.push(...regra.camposAfetados);
          resultado.camposObrigatorios.push(...regra.camposAfetados);
          if (regra.mensagemValidacao) {
            resultado.alertas.push(regra.mensagemValidacao);
          }
          break;

        case 'OPCIONAL':
          resultado.camposObrigatorios = resultado.camposObrigatorios.filter(
            c => !regra.camposAfetados.includes(c)
          );
          break;

        case 'VALOR':
          for (const campo of regra.camposAfetados) {
            if (typeof regra.valorPadrao === 'function') {
              resultado.valoresPadrao[campo] = regra.valorPadrao(proposta);
            } else {
              resultado.valoresPadrao[campo] = regra.valorPadrao;
            }
          }
          break;

        case 'VALIDAR':
          for (const campo of regra.camposAfetados) {
            resultado.errosValidacao.push({
              campo,
              mensagem: regra.mensagemValidacao || 'Campo inválido',
            });
          }
          break;
      }
    } catch (error) {
      console.error(`Erro ao processar regra ${regra.id}:`, error);
    }
  }

  // Remove duplicatas
  resultado.camposVisiveis = [...new Set(resultado.camposVisiveis)];
  resultado.camposObrigatorios = [...new Set(resultado.camposObrigatorios)];
  resultado.camposDesabilitados = [...new Set(resultado.camposDesabilitados)];

  return resultado;
}

/**
 * Valida uma proposta completa
 */
export function validarProposta(proposta: Partial<Proposta>): {
  valido: boolean;
  erros: { campo: string; mensagem: string }[];
  alertas: string[];
} {
  const regras = processarRegras(proposta);
  const erros: { campo: string; mensagem: string }[] = [...regras.errosValidacao];

  // Verifica campos obrigatórios
  for (const campo of regras.camposObrigatorios) {
    const valor = (proposta as Record<string, unknown>)[campo];
    if (valor === undefined || valor === null || valor === '') {
      erros.push({
        campo,
        mensagem: `Campo obrigatório: ${formatarNomeCampo(campo)}`,
      });
    }
  }

  return {
    valido: erros.length === 0,
    erros,
    alertas: regras.alertas,
  };
}

/**
 * Formata nome do campo para exibição
 */
function formatarNomeCampo(campo: string): string {
  const mapeamento: Record<string, string> = {
    tipo_produto: 'Tipo de Produto',
    cliente_nome: 'Nome do Cliente',
    cnpj_cliente: 'CNPJ',
    contato_nome: 'Nome do Contato',
    email_contato: 'Email',
    telefone_contato: 'Telefone',
    comprimento: 'Comprimento',
    modelo: 'Modelo',
    angulo_giro: 'Ângulo de Giro',
    aplicacao: 'Aplicação',
  };

  return mapeamento[campo] || campo.replace(/_/g, ' ');
}

/**
 * Obtém opções disponíveis para um campo baseado no estado atual
 */
export function obterOpcoesDisponiveis(
  campo: string,
  proposta: Partial<Proposta>
): { valor: string | number; label: string; desabilitado?: boolean }[] {
  switch (campo) {
    case 'comprimento':
      if (proposta.tipo_produto === 'TOMBADOR') {
        return [
          { valor: 11, label: '11 metros' },
          { valor: 12, label: '12 metros' },
          { valor: 18, label: '18 metros' },
          { valor: 21, label: '21 metros' },
          { valor: 26, label: '26 metros' },
          { valor: 30, label: '30 metros' },
        ];
      }
      return [];

    case 'modelo':
      if (proposta.tipo_produto === 'TOMBADOR') {
        const comp = proposta.comprimento || 0;
        return [
          { valor: 'SIMPLES', label: 'Simples', desabilitado: comp > 18 },
          { valor: 'DUPLO', label: 'Duplo', desabilitado: comp <= 12 },
        ];
      }
      return [];

    case 'angulo_giro':
      if (proposta.tipo_produto === 'COLETOR') {
        return [
          { valor: 180, label: '180°' },
          { valor: 270, label: '270°' },
          { valor: 360, label: '360°' },
        ];
      }
      return [];

    case 'forma_pagamento':
      return [
        { valor: 'AVISTA', label: 'À Vista' },
        { valor: 'PARCELADO', label: 'Parcelado' },
        { valor: 'FINANCIAMENTO', label: 'Financiamento BNDES' },
        { valor: 'ENTRADA_PARCELAS', label: 'Entrada + Parcelas' },
      ];

    case 'tipo_carga':
      return [
        { valor: 'GRAOS', label: 'Grãos' },
        { valor: 'FARELO', label: 'Farelo' },
        { valor: 'FERTILIZANTE', label: 'Fertilizante' },
        { valor: 'MINÉRIO', label: 'Minério' },
        { valor: 'OUTROS', label: 'Outros' },
      ];

    default:
      return [];
  }
}

/**
 * Exporta as regras para uso externo
 */
export { validarCNPJ, validarEmail, validarTelefone };
