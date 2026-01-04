export interface Atividade {
  id: number;
  numero_opd: string;
  atividade: string;
  responsavel: string;
  previsao_inicio: string | null;
  data_pedido: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  cadastro_opd: string | null;
  status: 'A REALIZAR' | 'EM ANDAMENTO' | 'CONCLUÍDA';
  status_alt: string | null;
  tempo_medio: number | null;
  observacoes: string | null;
  dias: number | null;
  formulario_anexo: {
    filename: string;
    url: string;
    size: number;
  } | null;
  created: string;
  updated: string;
}

export interface AtividadesResponse {
  success: boolean;
  data: Atividade[];
  total: number;
}

export interface UpdateAtividadeRequest {
  status?: 'A REALIZAR' | 'EM ANDAMENTO' | 'CONCLUÍDA';
  data_inicio?: string;
  data_termino?: string;
  observacoes?: string;
  dias?: number;
}

export type EstagioOPD =
  | 'LIBERAÇÃO FINANCEIRA'
  | 'CRIAÇÃO DA OPD'
  | 'DEFINIÇÃO DA OBRA CIVIL'
  | 'REUNIÃO DE START 1'
  | 'ENGENHARIA (MEC)'
  | 'ENGENHARIA (ELE/HID)'
  | 'REVISÃO FINAL DE PROJETOS'
  | 'REUNIÃO DE START 2'
  | 'PROGRAMAÇÃO DAS LINHAS'
  | 'RESERVAS DE COMP/FAB'
  | 'IMPRIMIR LISTAS E PLANOS'
  | 'ASSINATURA DOS PLANOS DE CORTE'
  | 'IMPRIMIR OF/ETIQUETA'
  | 'PROGRAMAÇÃO DE CORTE'
  | "ENTREGAR OF'S/LISTAS PARA ALMOX"
  | 'PRODUÇÃO'
  | 'EXPEDIÇÃO'
  | 'LIBERAÇÃO E EMBARQUE';

export interface StatusAtividade {
  total: number;
  concluidas: number;
  em_andamento: number;
  a_realizar: number;
  percentual_conclusao: number;
}
