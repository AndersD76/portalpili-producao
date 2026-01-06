// Tipos para Não Conformidades
export type TipoNaoConformidade = 'PRODUTO' | 'PROCESSO' | 'SERVICO' | 'FORNECEDOR' | 'SISTEMA';
export type OrigemNaoConformidade = 'INTERNA' | 'EXTERNA' | 'CLIENTE' | 'AUDITORIA' | 'FORNECEDOR';
export type GravidadeNaoConformidade = 'CRITICA' | 'MAIOR' | 'MENOR';
export type DisposicaoNaoConformidade = 'RETRABALHO' | 'SUCATA' | 'CONCESSAO' | 'DEVOLUCAO' | 'USO_COMO_ESTA';
export type StatusNaoConformidade = 'ABERTA' | 'EM_ANALISE' | 'PENDENTE_ACAO' | 'FECHADA';

export interface NaoConformidade {
  id: number;
  numero: string;
  data_ocorrencia: string;
  local_ocorrencia: string | null;
  setor_responsavel: string | null;
  tipo: TipoNaoConformidade;
  origem: OrigemNaoConformidade | null;
  gravidade: GravidadeNaoConformidade | null;
  descricao: string;
  evidencias: Anexo[] | null;
  produtos_afetados: string | null;
  quantidade_afetada: number | null;
  detectado_por: string | null;
  detectado_por_id: number | null;
  disposicao: DisposicaoNaoConformidade | null;
  disposicao_descricao: string | null;
  acao_contencao: string | null;
  data_contencao: string | null;
  responsavel_contencao: string | null;
  status: StatusNaoConformidade;
  acao_corretiva_id: number | null;
  created_by: number | null;
  created: string;
  updated: string;
  closed_by: number | null;
  closed_at: string | null;
}

// Tipos para Reclamação de Cliente
export type TipoReclamacao = 'PRODUTO' | 'ENTREGA' | 'ATENDIMENTO' | 'INSTALACAO' | 'SERVICO' | 'OUTRO';
export type ImpactoReclamacao = 'ALTO' | 'MEDIO' | 'BAIXO';
export type StatusReclamacao = 'ABERTA' | 'EM_ANALISE' | 'RESPONDIDA' | 'FECHADA';

export interface ReclamacaoCliente {
  id: number;
  numero: string;
  data_reclamacao: string;
  cliente_nome: string;
  cliente_contato: string | null;
  cliente_email: string | null;
  cliente_telefone: string | null;
  numero_opd: string | null;
  numero_serie: string | null;
  tipo_reclamacao: TipoReclamacao | null;
  descricao: string;
  evidencias: Anexo[] | null;
  impacto: ImpactoReclamacao | null;
  procedencia: boolean | null;
  justificativa_procedencia: string | null;
  resposta_cliente: string | null;
  data_resposta: string | null;
  responsavel_resposta: string | null;
  acao_tomada: string | null;
  data_resolucao: string | null;
  cliente_satisfeito: boolean | null;
  nao_conformidade_id: number | null;
  acao_corretiva_id: number | null;
  status: StatusReclamacao;
  created_by: number | null;
  created: string;
  updated: string;
}

// Tipos para Ação Corretiva
export type OrigemAcaoCorretiva = 'NAO_CONFORMIDADE' | 'RECLAMACAO' | 'AUDITORIA' | 'PROATIVO' | 'OUTRO';
export type MetodoAnalise = '5PORQUES' | 'ISHIKAWA' | 'FMEA' | '8D' | 'OUTRO';
export type StatusAcaoCorretiva = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_VERIFICACAO' | 'FECHADA';
export type StatusItemAcao = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';

export interface ItemAcao {
  id: string;
  descricao: string;
  responsavel: string;
  prazo: string;
  status: StatusItemAcao;
  data_conclusao: string | null;
  evidencia: Anexo | null;
  observacoes: string | null;
}

export interface AcaoCorretiva {
  id: number;
  numero: string;
  data_abertura: string;
  origem_tipo: OrigemAcaoCorretiva;
  origem_id: number | null;
  origem_descricao: string | null;
  descricao_problema: string;
  analise_causa_raiz: string | null;
  metodo_analise: MetodoAnalise | null;
  causa_raiz_identificada: string | null;
  acoes: ItemAcao[] | null;
  verificacao_eficacia: string | null;
  data_verificacao: string | null;
  responsavel_verificacao: string | null;
  acao_eficaz: boolean | null;
  padronizacao_realizada: boolean | null;
  descricao_padronizacao: string | null;
  documentos_atualizados: string[] | null;
  responsavel_principal: string | null;
  responsavel_principal_id: number | null;
  equipe: string[] | null;
  prazo_conclusao: string | null;
  data_conclusao: string | null;
  status: StatusAcaoCorretiva;
  created_by: number | null;
  created: string;
  updated: string;
}

// Tipos compartilhados
export interface Anexo {
  filename: string;
  url: string;
  size: number;
  tipo?: 'imagem' | 'documento' | 'video' | 'outro';
}

// Tipos para formulários
export interface NaoConformidadeFormData {
  data_ocorrencia: string;
  local_ocorrencia?: string;
  setor_responsavel?: string;
  tipo: TipoNaoConformidade;
  origem?: OrigemNaoConformidade;
  gravidade?: GravidadeNaoConformidade;
  descricao: string;
  produtos_afetados?: string;
  quantidade_afetada?: number;
  detectado_por?: string;
  disposicao?: DisposicaoNaoConformidade;
  disposicao_descricao?: string;
  acao_contencao?: string;
  responsavel_contencao?: string;
}

export interface ReclamacaoClienteFormData {
  data_reclamacao: string;
  cliente_nome: string;
  cliente_contato?: string;
  cliente_email?: string;
  cliente_telefone?: string;
  numero_opd?: string;
  numero_serie?: string;
  tipo_reclamacao?: TipoReclamacao;
  descricao: string;
  impacto?: ImpactoReclamacao;
}

export interface AcaoCorretivaFormData {
  data_abertura: string;
  origem_tipo: OrigemAcaoCorretiva;
  origem_id?: number;
  origem_descricao?: string;
  descricao_problema: string;
  responsavel_principal?: string;
  prazo_conclusao?: string;
}

// Constantes para labels
export const TIPOS_NAO_CONFORMIDADE: Record<TipoNaoConformidade, string> = {
  PRODUTO: 'Produto',
  PROCESSO: 'Processo',
  SERVICO: 'Serviço',
  FORNECEDOR: 'Fornecedor',
  SISTEMA: 'Sistema'
};

export const ORIGENS_NAO_CONFORMIDADE: Record<OrigemNaoConformidade, string> = {
  INTERNA: 'Interna',
  EXTERNA: 'Externa',
  CLIENTE: 'Cliente',
  AUDITORIA: 'Auditoria',
  FORNECEDOR: 'Fornecedor'
};

export const GRAVIDADES_NAO_CONFORMIDADE: Record<GravidadeNaoConformidade, string> = {
  CRITICA: 'Crítica',
  MAIOR: 'Maior',
  MENOR: 'Menor'
};

export const DISPOSICOES_NAO_CONFORMIDADE: Record<DisposicaoNaoConformidade, string> = {
  RETRABALHO: 'Retrabalho',
  SUCATA: 'Sucata',
  CONCESSAO: 'Concessão',
  DEVOLUCAO: 'Devolução',
  USO_COMO_ESTA: 'Usar como está'
};

export const STATUS_NAO_CONFORMIDADE: Record<StatusNaoConformidade, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  PENDENTE_ACAO: 'Pendente Ação',
  FECHADA: 'Fechada'
};

export const TIPOS_RECLAMACAO: Record<TipoReclamacao, string> = {
  PRODUTO: 'Produto',
  ENTREGA: 'Entrega',
  ATENDIMENTO: 'Atendimento',
  INSTALACAO: 'Instalação',
  SERVICO: 'Serviço',
  OUTRO: 'Outro'
};

export const IMPACTOS_RECLAMACAO: Record<ImpactoReclamacao, string> = {
  ALTO: 'Alto',
  MEDIO: 'Médio',
  BAIXO: 'Baixo'
};

export const STATUS_RECLAMACAO: Record<StatusReclamacao, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  RESPONDIDA: 'Respondida',
  FECHADA: 'Fechada'
};

export const ORIGENS_ACAO_CORRETIVA: Record<OrigemAcaoCorretiva, string> = {
  NAO_CONFORMIDADE: 'Não Conformidade',
  RECLAMACAO: 'Reclamação de Cliente',
  AUDITORIA: 'Auditoria',
  PROATIVO: 'Proativo',
  OUTRO: 'Outro'
};

export const METODOS_ANALISE: Record<MetodoAnalise, string> = {
  '5PORQUES': '5 Porquês',
  ISHIKAWA: 'Diagrama de Ishikawa',
  FMEA: 'FMEA',
  '8D': '8D',
  OUTRO: 'Outro'
};

export const STATUS_ACAO_CORRETIVA: Record<StatusAcaoCorretiva, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_VERIFICACAO: 'Aguardando Verificação',
  FECHADA: 'Fechada'
};

export const STATUS_ITEM_ACAO: Record<StatusItemAcao, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada'
};
