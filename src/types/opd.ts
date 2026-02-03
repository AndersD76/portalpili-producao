export interface Mensagem {
  id: string;
  autor: string;
  mensagem: string;
  timestamp: string;
  lida: boolean;
}

export interface OPD {
  id: number;
  opd: string | null;
  numero: string;
  cliente: string | null;
  data_pedido: string | null;
  previsao_inicio: string | null;
  previsao_termino: string | null;
  data_prevista_entrega: string | null;
  data_entrega: string | null;
  inicio_producao: string | null;
  tipo_opd: string;
  tipo_produto: 'TOMBADOR' | 'COLETOR' | null;
  responsavel_opd: string;
  atividades_opd: string | null;
  anexo_pedido: {
    url: string;
    size: number;
    filename: string;
  } | null;
  registros_atividade: string | null;
  mensagens: Mensagem[];
  created: string;
  updated: string;
  total_atividades?: number;
  atividades_concluidas?: number;
  atividades_em_andamento?: number;
  atividades_a_realizar?: number;
  percentual_conclusao?: number;
}

export interface OPDResponse {
  success: boolean;
  data: OPD[];
  total: number;
}
