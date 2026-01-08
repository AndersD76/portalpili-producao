// Tipos para Não Conformidades (Nº 57-1 - REV 01)

// Turno de Trabalho
export type TurnoTrabalho = 'DIA' | 'NOITE';

// Unidade de Fabricação
export type UnidadeFabricacao = 'UF1' | 'UF2' | 'UF3' | 'TERCEIRIZADO';

// Processo de Origem
export type ProcessoOrigem =
  | 'ALMOXARIFADO' | 'COMERCIAL' | 'COMPRAS' | 'CONTROLE_FISCAL'
  | 'ENGENHARIA' | 'ENTREGA_TECNICA' | 'FATURAMENTO_EXPEDICAO'
  | 'FINANCEIRO' | 'INSTALACAO' | 'LOGISTICA' | 'MANUTENCAO'
  | 'PCP' | 'PRODUCAO' | 'QUALIDADE' | 'RECURSOS_HUMANOS' | 'NENHUM';

// Tarefa de Origem
export type TarefaOrigem =
  | 'ACABAMENTO' | 'CORTE_CHANFROS_VIGAS_W' | 'LASER' | 'LOGISTICA_INTERNA'
  | 'MONTAGEM' | 'MONTAGEM_SOLDA_CAIXA_TRAVA_CHASSI' | 'MONTAGEM_SOLDA_CENTRAL'
  | 'MONTAGEM_SOLDA_TRAVA_PINO' | 'MONTAGEM_SOLDA_CALHAS' | 'MONTAGEM_SOLDA_REFORCOS_INFERIORES'
  | 'MONTAGEM_SOLDA_COLETOR' | 'MONTAGEM_SOLDA_TRAVA_RODA' | 'MONTAGEM_SOLDA_BRACOS'
  | 'MONTAGEM_SOLDA_SUB_CONJUNTOS' | 'MONTAGEM_SUPERIOR_ESQUADRO' | 'MONTAGEM_SOLDA_TRAVA_CHASSI'
  | 'MONTAGEM_ELETRICA_HIDRAULICA' | 'PINTURA' | 'PREPARACAO_PINTURA' | 'SERRA'
  | 'SOLDA_INFERIOR' | 'SOLDA_LADO_1' | 'SOLDA_LADO_2' | 'TESTE' | 'USINAGEM' | 'NENHUMA';

// Gravidade da NC
export type GravidadeNaoConformidade = 'ALTA' | 'MEDIA' | 'BAIXA' | 'NA';

// Tipo de NC
export type TipoNaoConformidade =
  | 'ERRO_MONTAGEM' | 'ERRO_MEDICAO' | 'MONTAGEM_PECAS_ERRADAS'
  | 'PINTURA' | 'PROJETO' | 'AUDITORIA' | 'FORNECEDOR' | 'SOLDA' | 'OUTRO';

// Disposição da NC
export type DisposicaoNaoConformidade = 'SUCATA' | 'RETRABALHO' | 'DEVOLUCAO' | 'ACEITE_CONDICIONAL' | 'REAPROVEITAMENTO' | 'NA';

// Status NC
export type StatusNaoConformidade = 'ABERTA' | 'EM_ANALISE' | 'PENDENTE_ACAO' | 'FECHADA';

export interface NaoConformidade {
  id: number;
  numero: string;
  // Identificação
  email: string;
  data_emissao: string;
  responsavel_emissao: string;
  turno_trabalho: TurnoTrabalho;
  unidade_fabricacao: UnidadeFabricacao;
  processo_origem: ProcessoOrigem;
  // Origem
  tarefa_origem: TarefaOrigem;
  numero_opd: string;
  codigo_peca: string;
  anexos: Anexo[] | null;
  // Descrição
  descricao: string;
  quantidade_itens: number;
  evidencia_objetiva: string;
  acao_imediata: string;
  responsaveis_acoes: string;
  prazo_acoes: string;
  // Classificação
  gravidade: GravidadeNaoConformidade;
  tipo: TipoNaoConformidade;
  // Disposição
  disposicao: DisposicaoNaoConformidade;
  responsavel_liberacao: string | null;
  // Sistema
  status: StatusNaoConformidade;
  acao_corretiva_id: number | null;
  created_by: number | null;
  created: string;
  updated: string;
  closed_by: number | null;
  closed_at: string | null;

  // Campos legados (para compatibilidade)
  data_ocorrencia?: string;
  local_ocorrencia?: string | null;
  setor_responsavel?: string | null;
  origem?: string | null;
  evidencias?: Anexo[] | null;
  produtos_afetados?: string | null;
  quantidade_afetada?: number | null;
  detectado_por?: string | null;
  detectado_por_id?: number | null;
  disposicao_descricao?: string | null;
  acao_contencao?: string | null;
  data_contencao?: string | null;
  responsavel_contencao?: string | null;
}

// Tipos para Reclamação de Cliente (Nº 57-2 - REV. 01)
export type StatusReclamacao = 'ABERTA' | 'EM_ANALISE' | 'RESPONDIDA' | 'FECHADA';

export interface ReclamacaoCliente {
  id: number;
  numero: string;
  // Identificação
  email: string;
  data_emissao: string;
  nome_emitente: string;
  // Reclamação de Cliente
  nome_cliente: string;
  numero_opd: string;
  numero_nf: string | null;
  codigo_equipamento: string | null;
  local_instalado: string;
  descricao: string;
  anexos: Anexo[] | null;
  acao_imediata: string;
  // Sistema
  status: StatusReclamacao;
  nao_conformidade_id: number | null;
  acao_corretiva_id: number | null;
  created_by: number | null;
  created: string;
  updated: string;

  // Campos legados (para compatibilidade)
  data_reclamacao?: string;
  cliente_nome?: string;
  cliente_contato?: string | null;
  cliente_email?: string | null;
  cliente_telefone?: string | null;
  numero_serie?: string | null;
  tipo_reclamacao?: string | null;
  evidencias?: Anexo[] | null;
  impacto?: string | null;
  procedencia?: boolean | null;
  justificativa_procedencia?: string | null;
  resposta_cliente?: string | null;
  data_resposta?: string | null;
  responsavel_resposta?: string | null;
  acao_tomada?: string | null;
  data_resolucao?: string | null;
  cliente_satisfeito?: boolean | null;
}

// Tipos para Ação Corretiva (Nº 57-3 - REV. 01)
export type StatusAcoesAC = 'EM_ANDAMENTO' | 'FINALIZADAS';
export type AcoesFinalizadasAC = 'SIM' | 'NAO' | 'PARCIALMENTE';
export type SituacaoFinalAC = 'EFICAZ' | 'PARCIALMENTE_EFICAZ' | 'NAO_EFICAZ';
export type StatusAcaoCorretiva = 'ABERTA' | 'EM_ANDAMENTO' | 'AGUARDANDO_VERIFICACAO' | 'FECHADA';

// Processos envolvidos na AC (mesmo que processo_origem)
export type ProcessoEnvolvidoAC = ProcessoOrigem;

export interface AcaoCorretiva {
  id: number;
  numero: string;
  // Identificação
  email: string;
  data_emissao: string;
  emitente: string;
  numero_nc_relacionada: string | null;
  registro_nc_anexos: Anexo[] | null;
  // Análise das Causas
  processos_envolvidos: ProcessoEnvolvidoAC[];
  falha: string;
  causas: string;
  subcausas: string | null;
  // Ações para Eliminar as Causas
  acoes: string;
  responsaveis: string;
  prazo: string;
  // Condições das Ações
  status_acoes: StatusAcoesAC;
  // Análise da Eficácia
  acoes_finalizadas: AcoesFinalizadasAC | null;
  evidencias_anexos: Anexo[] | null;
  situacao_final: SituacaoFinalAC | null;
  responsavel_analise: string | null;
  data_analise: string | null;
  // Sistema
  status: StatusAcaoCorretiva;
  created_by: number | null;
  created: string;
  updated: string;

  // Campos legados (para compatibilidade)
  data_abertura?: string;
  origem_tipo?: string;
  origem_id?: number | null;
  origem_descricao?: string | null;
  descricao_problema?: string;
  analise_causa_raiz?: string | null;
  metodo_analise?: string | null;
  causa_raiz_identificada?: string | null;
  verificacao_eficacia?: string | null;
  data_verificacao?: string | null;
  responsavel_verificacao?: string | null;
  acao_eficaz?: boolean | null;
  padronizacao_realizada?: boolean | null;
  descricao_padronizacao?: string | null;
  documentos_atualizados?: string[] | null;
  responsavel_principal?: string | null;
  responsavel_principal_id?: number | null;
  equipe?: string[] | null;
  prazo_conclusao?: string | null;
  data_conclusao?: string | null;
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
  email: string;
  data_emissao: string;
  responsavel_emissao: string;
  turno_trabalho: TurnoTrabalho | '';
  unidade_fabricacao: UnidadeFabricacao | '';
  processo_origem: ProcessoOrigem | '';
  tarefa_origem: TarefaOrigem | '';
  numero_opd: string;
  codigo_peca: string;
  descricao: string;
  quantidade_itens: string;
  evidencia_objetiva: string;
  acao_imediata: string;
  responsaveis_acoes: string;
  prazo_acoes: string;
  gravidade: GravidadeNaoConformidade | '';
  tipo: TipoNaoConformidade | '';
  disposicao: DisposicaoNaoConformidade | '';
  responsavel_liberacao: string;
}

export interface ReclamacaoClienteFormData {
  email: string;
  data_emissao: string;
  nome_emitente: string;
  nome_cliente: string;
  numero_opd: string;
  numero_nf: string;
  codigo_equipamento: string;
  local_instalado: string;
  descricao: string;
  acao_imediata: string;
}

export interface AcaoCorretivaFormData {
  email: string;
  data_emissao: string;
  emitente: string;
  numero_nc_relacionada: string;
  processos_envolvidos: ProcessoEnvolvidoAC[];
  falha: string;
  causas: string;
  subcausas: string;
  acoes: string;
  responsaveis: string;
  prazo: string;
  status_acoes: StatusAcoesAC | '';
  acoes_finalizadas: AcoesFinalizadasAC | '';
  situacao_final: SituacaoFinalAC | '';
  responsavel_analise: string;
  data_analise: string;
}

// Tipos legados (mantidos para compatibilidade)
export type TipoReclamacao = 'PRODUTO' | 'ENTREGA' | 'ATENDIMENTO' | 'INSTALACAO' | 'SERVICO' | 'OUTRO';
export type ImpactoReclamacao = 'ALTO' | 'MEDIO' | 'BAIXO';
export type OrigemNaoConformidade = 'INTERNA' | 'EXTERNA' | 'CLIENTE' | 'AUDITORIA' | 'FORNECEDOR';
export type OrigemAcaoCorretiva = 'NAO_CONFORMIDADE' | 'RECLAMACAO' | 'AUDITORIA' | 'PROATIVO' | 'OUTRO';
export type MetodoAnalise = '5PORQUES' | 'ISHIKAWA' | 'FMEA' | '8D' | 'OUTRO';
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

// Constantes para labels - Não Conformidade
export const TURNOS_TRABALHO: Record<TurnoTrabalho, string> = {
  DIA: 'Dia',
  NOITE: 'Noite'
};

export const UNIDADES_FABRICACAO: Record<UnidadeFabricacao, string> = {
  UF1: 'UF1',
  UF2: 'UF2',
  UF3: 'UF3',
  TERCEIRIZADO: 'Terceirizado'
};

export const PROCESSOS_ORIGEM: Record<ProcessoOrigem, string> = {
  ALMOXARIFADO: 'Almoxarifado',
  COMERCIAL: 'Comercial',
  COMPRAS: 'Compras',
  CONTROLE_FISCAL: 'Controle fiscal',
  ENGENHARIA: 'Engenharia',
  ENTREGA_TECNICA: 'Entrega técnica',
  FATURAMENTO_EXPEDICAO: 'Faturamento e expedição',
  FINANCEIRO: 'Financeiro',
  INSTALACAO: 'Instalação',
  LOGISTICA: 'Logística',
  MANUTENCAO: 'Manutenção',
  PCP: 'PCP',
  PRODUCAO: 'Produção',
  QUALIDADE: 'Qualidade',
  RECURSOS_HUMANOS: 'Recursos humanos',
  NENHUM: 'Nenhum'
};

export const TAREFAS_ORIGEM: Record<TarefaOrigem, string> = {
  ACABAMENTO: 'Acabamento',
  CORTE_CHANFROS_VIGAS_W: 'Corte e chanfros de vigas W',
  LASER: 'Laser',
  LOGISTICA_INTERNA: 'Logística interna',
  MONTAGEM: 'Montagem',
  MONTAGEM_SOLDA_CAIXA_TRAVA_CHASSI: 'Montagem e solda da caixa do trava chassi',
  MONTAGEM_SOLDA_CENTRAL: 'Montagem e solda da central',
  MONTAGEM_SOLDA_TRAVA_PINO: 'Montagem e solda da trava pino',
  MONTAGEM_SOLDA_CALHAS: 'Montagem e solda das calhas',
  MONTAGEM_SOLDA_REFORCOS_INFERIORES: 'Montagem e solda de reforços inferiores',
  MONTAGEM_SOLDA_COLETOR: 'Montagem e solda do coletor',
  MONTAGEM_SOLDA_TRAVA_RODA: 'Montagem e solda do trava roda',
  MONTAGEM_SOLDA_BRACOS: 'Montagem e solda dos braços',
  MONTAGEM_SOLDA_SUB_CONJUNTOS: 'Montagem e solda dos sub conjuntos',
  MONTAGEM_SUPERIOR_ESQUADRO: 'Montagem e superior e esquadro',
  MONTAGEM_SOLDA_TRAVA_CHASSI: 'Montagem e solda trava chassi',
  MONTAGEM_ELETRICA_HIDRAULICA: 'Montagem elétrica/hidráulica',
  PINTURA: 'Pintura',
  PREPARACAO_PINTURA: 'Preparação para pintura',
  SERRA: 'Serra',
  SOLDA_INFERIOR: 'Solda inferior',
  SOLDA_LADO_1: 'Solda lado 1',
  SOLDA_LADO_2: 'Solda lado 2',
  TESTE: 'Teste',
  USINAGEM: 'Usinagem',
  NENHUMA: 'Nenhuma'
};

export const GRAVIDADES_NAO_CONFORMIDADE: Record<GravidadeNaoConformidade, string> = {
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
  NA: 'N/A'
};

export const TIPOS_NAO_CONFORMIDADE: Record<TipoNaoConformidade, string> = {
  ERRO_MONTAGEM: 'Erro de montagem',
  ERRO_MEDICAO: 'Erro de medição',
  MONTAGEM_PECAS_ERRADAS: 'Montagem com peças erradas',
  PINTURA: 'Pintura',
  PROJETO: 'Projeto',
  AUDITORIA: 'Auditoria',
  FORNECEDOR: 'Fornecedor',
  SOLDA: 'Solda',
  OUTRO: 'Outro'
};

export const DISPOSICOES_NAO_CONFORMIDADE: Record<DisposicaoNaoConformidade, string> = {
  SUCATA: 'Sucata',
  RETRABALHO: 'Retrabalho',
  DEVOLUCAO: 'Devolução',
  ACEITE_CONDICIONAL: 'Aceite condicional',
  REAPROVEITAMENTO: 'Reaproveitamento',
  NA: 'N/A'
};

export const STATUS_NAO_CONFORMIDADE: Record<StatusNaoConformidade, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  PENDENTE_ACAO: 'Pendente Ação',
  FECHADA: 'Fechada'
};

// Constantes para labels - Reclamação de Cliente
export const STATUS_RECLAMACAO: Record<StatusReclamacao, string> = {
  ABERTA: 'Aberta',
  EM_ANALISE: 'Em Análise',
  RESPONDIDA: 'Respondida',
  FECHADA: 'Fechada'
};

// Constantes para labels - Ação Corretiva
export const STATUS_ACOES_AC: Record<StatusAcoesAC, string> = {
  EM_ANDAMENTO: 'Em Andamento',
  FINALIZADAS: 'Finalizadas'
};

export const ACOES_FINALIZADAS_AC: Record<AcoesFinalizadasAC, string> = {
  SIM: 'Sim',
  NAO: 'Não',
  PARCIALMENTE: 'Parcialmente'
};

export const SITUACAO_FINAL_AC: Record<SituacaoFinalAC, string> = {
  EFICAZ: 'Eficaz',
  PARCIALMENTE_EFICAZ: 'Parcialmente Eficaz',
  NAO_EFICAZ: 'Não Eficaz'
};

export const STATUS_ACAO_CORRETIVA: Record<StatusAcaoCorretiva, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em Andamento',
  AGUARDANDO_VERIFICACAO: 'Aguardando Verificação',
  FECHADA: 'Fechada'
};

// Constantes legadas (mantidas para compatibilidade)
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

export const ORIGENS_NAO_CONFORMIDADE: Record<OrigemNaoConformidade, string> = {
  INTERNA: 'Interna',
  EXTERNA: 'Externa',
  CLIENTE: 'Cliente',
  AUDITORIA: 'Auditoria',
  FORNECEDOR: 'Fornecedor'
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

export const STATUS_ITEM_ACAO: Record<StatusItemAcao, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada'
};
