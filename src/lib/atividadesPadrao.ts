// Lista de atividades padrão para novas OPDs
export const ATIVIDADES_PADRAO = [
  {
    atividade: 'LIBERAÇÃO COMERCIAL',
    responsavel: 'COMERCIAL',
    ordem: 1,
    visivel_cq: false,
  },
  {
    atividade: 'LIBERAÇÃO FINANCEIRA',
    responsavel: 'FINANCEIRO',
    ordem: 2,
    visivel_cq: false,
  },
  {
    atividade: 'DEFINIÇÃO DA OBRA CIVIL',
    responsavel: 'PCP',
    ordem: 3,
    visivel_cq: false,
  },
  {
    atividade: 'REUNIÃO DE START 1',
    responsavel: 'PCP',
    ordem: 4,
    visivel_cq: false,
  },
  {
    atividade: 'ENGENHARIA (MEC)',
    responsavel: 'ENGENHARIA (MEC)',
    ordem: 5,
    visivel_cq: false,
  },
  {
    atividade: 'ENGENHARIA (ELE/HID)',
    responsavel: 'ENGENHARIA (ELE/HID)',
    ordem: 6,
    visivel_cq: false,
  },
  {
    atividade: 'REVISÃO FINAL DE PROJETOS',
    responsavel: 'PCP',
    ordem: 7,
    visivel_cq: false,
  },
  {
    atividade: 'REUNIÃO DE START 2',
    responsavel: 'PCP',
    ordem: 8,
    visivel_cq: false,
  },
  {
    atividade: 'PROGRAMAÇÃO DAS LINHAS',
    responsavel: 'PCP',
    ordem: 9,
    visivel_cq: false,
  },
  {
    atividade: 'RESERVAS DE COMP/FAB',
    responsavel: 'PCP',
    ordem: 10,
    visivel_cq: false,
  },
  {
    atividade: 'IMPRIMIR LISTAS E PLANOS',
    responsavel: 'PCP',
    ordem: 11,
    visivel_cq: false,
  },
  {
    atividade: 'ASSINATURA DOS PLANOS DE CORTE',
    responsavel: 'ENGENHARIA',
    ordem: 12,
    visivel_cq: false,
  },
  {
    atividade: 'IMPRIMIR OF/ETIQUETA',
    responsavel: 'PCP',
    ordem: 13,
    visivel_cq: false,
  },
  {
    atividade: 'PROGRAMAÇÃO DE CORTE',
    responsavel: 'PCP',
    ordem: 14,
    visivel_cq: false,
  },
  {
    atividade: "ENTREGAR OF'S/LISTAS PARA ALMOX",
    responsavel: 'PCP',
    ordem: 15,
    visivel_cq: false,
  },
  {
    atividade: 'SEPARAR LISTAS PARA A PRODUÇÃO',
    responsavel: 'PCP',
    ordem: 16,
    visivel_cq: false,
  },
  {
    atividade: 'PRODUÇÃO',
    responsavel: 'PRODUÇÃO',
    ordem: 17,
    visivel_cq: true,
  },
  {
    atividade: 'EXPEDIÇÃO',
    responsavel: 'EXPEDIÇÃO',
    ordem: 18,
    visivel_cq: true,
  },
  {
    atividade: 'LIBERAÇÃO E EMBARQUE',
    responsavel: 'EXPEDIÇÃO',
    ordem: 19,
    visivel_cq: true,
  },
  {
    atividade: 'PREPARAÇÃO',
    responsavel: 'INSTALAÇÃO',
    ordem: 20,
    visivel_cq: false,
  },
  {
    atividade: 'DESEMBARQUE E PRÉ-INSTALAÇÃO',
    responsavel: 'INSTALAÇÃO',
    ordem: 21,
    visivel_cq: false,
  },
  {
    atividade: 'ENTREGA',
    responsavel: 'INSTALAÇÃO',
    ordem: 22,
    visivel_cq: false,
  },
];

// Subtarefas de PRODUÇÃO para TOMBADOR (Plataformas de descarga)
export const SUBTAREFAS_PRODUCAO_TOMBADOR = [
  {
    atividade: 'CORTE',
    responsavel: 'PRODUÇÃO',
    ordem: 1,
    visivel_cq: true,
  },
  {
    atividade: 'SOLDA INFERIOR',
    responsavel: 'PRODUÇÃO',
    ordem: 2,
    visivel_cq: true,
  },
  {
    atividade: 'CENTRAL/SUBCONJUNTOS',
    responsavel: 'PRODUÇÃO',
    ordem: 3,
    visivel_cq: true,
  },
  {
    atividade: 'PEDESTAIS',
    responsavel: 'PRODUÇÃO',
    ordem: 4,
    visivel_cq: true,
  },
  {
    atividade: 'SOB PLATAFORMA',
    responsavel: 'PRODUÇÃO',
    ordem: 5,
    visivel_cq: true,
  },
  {
    atividade: 'BRAÇOS',
    responsavel: 'PRODUÇÃO',
    ordem: 6,
    visivel_cq: true,
  },
  {
    atividade: 'RAMPAS',
    responsavel: 'PRODUÇÃO',
    ordem: 7,
    visivel_cq: true,
  },
  {
    atividade: 'MONTAGEM CALHAS',
    responsavel: 'PRODUÇÃO',
    ordem: 8,
    visivel_cq: true,
  },
  {
    atividade: 'TRAVADOR DE RODAS',
    responsavel: 'PRODUÇÃO',
    ordem: 9,
    visivel_cq: true,
  },
  {
    atividade: 'TRAVA CHASSI',
    responsavel: 'PRODUÇÃO',
    ordem: 10,
    visivel_cq: true,
  },
  {
    atividade: 'CAIXA TRAVA CHASSI',
    responsavel: 'PRODUÇÃO',
    ordem: 11,
    visivel_cq: true,
  },
  {
    atividade: 'CAVALETE TRAVA CHASSI',
    responsavel: 'PRODUÇÃO',
    ordem: 12,
    visivel_cq: true,
  },
  {
    atividade: 'PAINEL ELÉTRICO',
    responsavel: 'PRODUÇÃO',
    ordem: 13,
    visivel_cq: true,
  },
  {
    atividade: 'MONTAGEM ELÉTRICA/HIDRÁULICA',
    responsavel: 'PRODUÇÃO',
    ordem: 14,
    visivel_cq: true,
  },
  {
    atividade: 'MONTAGEM HIDRÁULICA SOB PLATAFORMA',
    responsavel: 'PRODUÇÃO',
    ordem: 15,
    visivel_cq: true,
  },
  {
    atividade: 'PINTURA',
    responsavel: 'PRODUÇÃO',
    ordem: 16,
    visivel_cq: true,
  },
];

// Subtarefas de PRODUÇÃO para COLETOR (Coletores de grãos)
export const SUBTAREFAS_PRODUCAO_COLETOR = [
  {
    atividade: 'COLETOR - MONTAGEM INICIAL',
    responsavel: 'PRODUÇÃO',
    ordem: 1,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - CENTRAL HIDRÁULICA',
    responsavel: 'PRODUÇÃO',
    ordem: 2,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - CICLONE',
    responsavel: 'PRODUÇÃO',
    ordem: 3,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - TUBO COLETA',
    responsavel: 'PRODUÇÃO',
    ordem: 4,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - COLUNA INFERIOR',
    responsavel: 'PRODUÇÃO',
    ordem: 5,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - COLUNA SUPERIOR',
    responsavel: 'PRODUÇÃO',
    ordem: 6,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - ESCADA PLATIBANDA',
    responsavel: 'PRODUÇÃO',
    ordem: 7,
    visivel_cq: true,
  },
  {
    atividade: 'COLETOR - PINTURA',
    responsavel: 'PRODUÇÃO',
    ordem: 8,
    visivel_cq: true,
  },
];

// Função para obter subtarefas de produção baseado no tipo de produto
export function getSubtarefasProducao(tipoProduto: 'TOMBADOR' | 'COLETOR' = 'TOMBADOR') {
  return tipoProduto === 'COLETOR' ? SUBTAREFAS_PRODUCAO_COLETOR : SUBTAREFAS_PRODUCAO_TOMBADOR;
}

// Para compatibilidade, exportar SUBTAREFAS_PRODUCAO como TOMBADOR por padrão
export const SUBTAREFAS_PRODUCAO = SUBTAREFAS_PRODUCAO_TOMBADOR;

export function calcularPrevisaoInicio(dataPedido: Date, ordemAtividade: number): Date {
  const previsao = new Date(dataPedido);
  previsao.setDate(previsao.getDate() + ordemAtividade);
  return previsao;
}

// Função auxiliar para obter apenas atividades visíveis no CQ
export function getAtividadesCQ() {
  return ATIVIDADES_PADRAO.filter(atividade => atividade.visivel_cq);
}
