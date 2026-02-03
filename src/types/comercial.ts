// =============================================
// SISTEMA COMERCIAL PILI - TIPOS TYPESCRIPT
// =============================================

// =============================================
// ENUMS
// =============================================

export type ProdutoTipo = 'TOMBADOR' | 'COLETOR';

export type TombadorTipo = 'FIXO' | 'MOVEL';
export type TombadorTamanho = 11 | 12 | 18 | 21 | 26 | 30;

export type ColetorGrau = 180 | 270 | 360;
export type ColetorTipo = 'ROTATIVO';

export type PropostaSituacao =
  | 'RASCUNHO'
  | 'GERADA'
  | 'ENVIADA'
  | 'EM_NEGOCIACAO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'EXPIRADA'
  | 'FECHADA'
  | 'PERDIDA'
  | 'CANCELADA'
  | 'SUBSTITUIDA';

export type OportunidadeEstagio =
  | 'PROSPECCAO'
  | 'QUALIFICACAO'
  | 'PROPOSTA'
  | 'NEGOCIACAO'
  | 'FECHAMENTO';

export type OportunidadeStatus = 'ABERTA' | 'GANHA' | 'PERDIDA' | 'CANCELADA';

export type ClienteStatus = 'ATIVO' | 'INATIVO' | 'BLOQUEADO';
export type ClienteTemperatura = 'FRIO' | 'MORNO' | 'QUENTE';
export type ClientePorte = 'MEI' | 'ME' | 'EPP' | 'MEDIO' | 'GRANDE';
export type ClienteSegmento = 'AGRO' | 'COOPERATIVA' | 'CEREALISTA' | 'TRADING' | 'INDUSTRIA' | 'FAZENDA' | 'OUTROS';
export type ClienteRegiao = 'SUL' | 'SUDESTE' | 'CENTRO-OESTE' | 'NORDESTE' | 'NORTE';
export type ClienteOrigem = 'INDICACAO' | 'FEIRA' | 'SITE' | 'PROSPECCAO' | 'MARKETING' | 'TELEFONE';

export type AtividadeTipo = 'LIGACAO' | 'EMAIL' | 'REUNIAO' | 'VISITA' | 'TAREFA' | 'NOTA' | 'WHATSAPP' | 'PROPOSTA';
export type AtividadeStatus = 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA' | 'ATRASADA';
export type AtividadePrioridade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type AtividadeResultado = 'ATENDEU' | 'NAO_ATENDEU' | 'REMARCOU' | 'INTERESSADO' | 'SEM_INTERESSE' | 'FECHOU';

export type VendedorCargo = 'VENDEDOR' | 'GERENTE' | 'DIRETOR';

export type PrecoTipo = 'FIXO' | 'POR_METRO' | 'POR_UNIDADE' | 'POR_LITRO' | 'PERCENTUAL';

export type FreteTipo = 'CIF' | 'FOB';

// =============================================
// INTERFACES - VENDEDOR
// =============================================

export interface Vendedor {
  id: number;
  usuario_id?: number;
  nome: string;
  email: string;
  telefone?: string;
  whatsapp?: string;
  avatar_url?: string;
  cargo: VendedorCargo;
  comissao_padrao: number;
  meta_mensal?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// INTERFACES - CLIENTE
// =============================================

export interface Cliente {
  id: number;
  // Dados básicos
  razao_social: string;
  nome_fantasia?: string;
  cpf_cnpj?: string;
  inscricao_estadual?: string;
  // Dados da Receita
  cnae_codigo?: string;
  cnae_descricao?: string;
  natureza_juridica?: string;
  porte?: ClientePorte;
  capital_social?: number;
  data_abertura?: string;
  situacao_receita?: string;
  // Contato principal
  contato_nome?: string;
  contato_cargo?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  // Endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  estado?: string;
  pais: string;
  regiao?: ClienteRegiao;
  // Segmentação
  segmento?: ClienteSegmento;
  origem?: ClienteOrigem;
  // CRM
  vendedor_id?: number;
  vendedor_nome?: string;
  status: ClienteStatus;
  temperatura: ClienteTemperatura;
  tags?: string[];
  // Financeiro
  limite_credito?: number;
  prazo_pagamento?: number;
  // Score IA
  score_potencial?: number;
  ultima_analise_ia?: string;
  // Metadados
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contato {
  id: number;
  cliente_id: number;
  nome: string;
  cargo?: string;
  departamento?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  principal: boolean;
  decisor: boolean;
  ativo: boolean;
  observacoes?: string;
  created_at: string;
}

// =============================================
// INTERFACES - OPORTUNIDADE
// =============================================

export interface Oportunidade {
  id: number;
  cliente_id: number;
  cliente_razao_social?: string;
  vendedor_id: number;
  vendedor_nome?: string;
  contato_id?: number;
  titulo: string;
  descricao?: string;
  produto?: ProdutoTipo;
  tamanho_interesse?: number;
  tipo_interesse?: TombadorTipo;
  estagio: OportunidadeEstagio;
  probabilidade: number;
  valor_estimado?: number;
  valor_final?: number;
  data_abertura: string;
  data_previsao_fechamento?: string;
  data_fechamento?: string;
  dias_no_estagio: number;
  status: OportunidadeStatus;
  motivo_perda?: string;
  concorrente?: string;
  justificativa_perda?: string;
  fonte?: string;
  temperatura: ClienteTemperatura;
  proxima_acao?: string;
  data_proxima_acao?: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// INTERFACES - ATIVIDADE
// =============================================

export interface AtividadeCRM {
  id: number;
  cliente_id?: number;
  cliente_razao_social?: string;
  oportunidade_id?: number;
  vendedor_id: number;
  vendedor_nome?: string;
  tipo: AtividadeTipo;
  titulo: string;
  descricao?: string;
  data_agendada?: string;
  data_conclusao?: string;
  duracao_minutos?: number;
  status: AtividadeStatus;
  prioridade: AtividadePrioridade;
  resultado?: AtividadeResultado;
  notas_resultado?: string;
  lembrete_minutos?: number;
  lembrete_enviado: boolean;
  created_at: string;
}

// =============================================
// INTERFACES - PREÇOS
// =============================================

export interface PrecoCategoria {
  id: number;
  codigo: string;
  nome: string;
  descricao?: string;
  produto?: 'TOMBADOR' | 'COLETOR' | 'AMBOS';
  icone?: string;
  cor?: string;
  ordem_exibicao: number;
  ativo: boolean;
}

export interface PrecoBase {
  id: number;
  tipo_produto: ProdutoTipo;
  modelo: string;
  comprimento?: number;
  descricao?: string;
  preco: number;
  capacidade?: string;
  aplicacao?: string;
  qt_cilindros?: number;
  qt_motores?: number;
  qt_oleo?: number;
  qt_trava_chassi?: number;
  qt_trava_roda?: number;
  angulo_inclinacao?: string;
  mangueiras_padrao?: number;
  cabos_eletricos_padrao?: number;
  ativo: boolean;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  ordem_exibicao?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PrecoOpcao {
  id: number;
  categoria_id: number;
  categoria_nome?: string;
  codigo: string;
  nome: string;
  descricao?: string;
  preco?: number;
  preco_tipo?: PrecoTipo;
  valor: number;
  tipo_valor: 'FIXO' | 'PERCENTUAL' | 'POR_METRO' | 'POR_UNIDADE';
  tipo_produto_aplicavel?: ProdutoTipo;
  produto?: 'TOMBADOR' | 'COLETOR' | 'AMBOS';
  tamanhos_aplicaveis?: number[];
  tipos_aplicaveis?: string[];
  obrigatorio: boolean;
  incluso_no_base: boolean;
  quantidade_minima: number;
  quantidade_maxima?: number;
  quantidade_padrao: number;
  permite_quantidade: boolean;
  grupo_exclusivo?: string;
  requer_opcao?: string[];
  incompativel_com?: string[];
  texto_proposta?: string;
  texto_caracteristicas?: string;
  texto_orcamento?: string;
  destaque: boolean;
  ativo: boolean;
  vigencia_inicio?: string;
  vigencia_fim?: string;
  ordem_exibicao: number;
}

export interface PrecoDesconto {
  id: number;
  nome: string;
  tipo: string;
  descricao?: string;
  percentual: number;
  desconto_percentual?: number;
  fator_multiplicador?: number;
  comissao_percentual?: number;
  valor_minimo?: number;
  valor_maximo?: number;
  quantidade_minima?: number;
  segmentos_aplicaveis?: string[];
  regioes_aplicaveis?: string[];
  desconto_maximo_vendedor?: boolean;
  requer_aprovacao_gerente?: boolean;
  requer_aprovacao_diretor?: boolean;
  ativo: boolean;
  ordem_exibicao?: number;
}

export interface PrecoConfig {
  id: number;
  chave: string;
  valor: string;
  tipo: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  descricao?: string;
  grupo?: string;
  editavel: boolean;
}

// Alias for compatibility
export type PrecoConfiguracao = PrecoConfig;

export interface ItemCalculo {
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  tipo: 'BASE' | 'OPCIONAL' | 'DESCONTO' | 'AJUSTE' | 'SERVICO' | 'FRETE';
  codigo?: string;
  detalhe?: string;
}

export interface PrecoRegra {
  id: number;
  nome: string;
  descricao?: string;
  tipo_acao: 'ADICIONAR_VALOR' | 'ADICIONAR_PERCENTUAL' | 'DESCONTO_VALOR' | 'DESCONTO_PERCENTUAL';
  valor_acao: number;
  condicoes?: Record<string, unknown>;
  condicao_campo?: string;
  condicao_operador?: 'IGUAL' | 'DIFERENTE' | 'MAIOR' | 'MENOR' | 'EM' | 'NAO_EM' | 'ENTRE';
  condicao_valor?: string;
  acao_tipo?: 'HABILITAR' | 'DESABILITAR' | 'OBRIGAR' | 'OCULTAR' | 'AJUSTAR_PRECO' | 'DEFINIR_QUANTIDADE';
  acao_alvo?: string;
  acao_valor?: string;
  mensagem_usuario?: string;
  prioridade?: number;
  ativo: boolean;
}

export interface PrecoHistorico {
  id: number;
  tabela: string;
  registro_id: number;
  acao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_anteriores?: Record<string, unknown>;
  dados_novos?: Record<string, unknown>;
  campos_alterados?: string[];
  usuario_id?: number;
  usuario_nome?: string;
  ip_address?: string;
  motivo?: string;
  created_at: string;
}

// =============================================
// INTERFACES - PROPOSTA
// =============================================

export interface OpcionalSelecionado {
  codigo: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  preco_total: number;
  texto_proposta?: string;
}

export interface Proposta {
  id: number;
  numero_proposta: number;
  // Relacionamentos
  vendedor_id: number;
  vendedor_nome?: string;
  cliente_id: number;
  cliente_razao_social?: string;
  cliente_municipio?: string;
  cliente_estado?: string;
  oportunidade_id?: number;
  contato_id?: number;
  // Status
  situacao: PropostaSituacao;
  // Datas
  data_proposta: string;
  data_visita?: string;
  validade_dias: number;
  data_validade?: string;
  prazo_entrega_dias?: number;
  data_envio?: string;
  data_aprovacao?: string;
  data_rejeicao?: string;
  // Produto (common fields for pricing rules)
  produto: ProdutoTipo;
  tipo_produto?: ProdutoTipo;
  comprimento?: number;
  modelo?: string;
  angulo_giro?: number;
  tipo_carga?: string;
  aplicacao?: string;
  quantidade?: number;
  opcionais_ids?: number[];
  estado_entrega?: string;
  instalacao_inclusa?: boolean;
  treinamento_incluso?: boolean;
  forma_pagamento?: string;
  cnpj_cliente?: string;
  email_contato?: string;
  telefone_contato?: string;
  chance_concretizacao?: number;

  // TOMBADOR
  tombador_tamanho?: TombadorTamanho;
  tombador_tipo?: TombadorTipo;
  tombador_complemento_titulo?: string;
  tombador_comprimento_trilhos?: number;
  tombador_opcionais?: OpcionalSelecionado[];
  tombador_voltagem?: string;
  tombador_frequencia?: string;
  tombador_qt_mangueiras?: number;
  tombador_qt_cabos_eletricos?: number;
  tombador_botoeiras?: string;
  tombador_qt_fio_botoeira?: number;
  tombador_modelo?: string;
  tombador_capacidade?: string;
  tombador_qt_cilindros?: number;
  tombador_tipo_cilindros?: string;
  tombador_qt_motores?: number;
  tombador_qt_oleo?: number;
  tombador_qt_trava_chassi?: number;
  tombador_qt_trava_roda?: number;
  tombador_angulo_inclinacao?: string;
  tombador_aplicacao?: string;
  tombador_outros_requisitos?: string;
  tombador_observacoes?: string;
  tombador_preco_base?: number;
  tombador_subtotal_opcionais?: number;
  tombador_subtotal?: number;
  tombador_quantidade?: number;
  tombador_preco_equipamento?: number;
  tombador_total_geral?: number;
  tombador_forma_pagamento?: string;

  // COLETOR
  coletor_grau_rotacao?: ColetorGrau;
  coletor_tipo?: ColetorTipo;
  coletor_comprimento_trilhos?: number;
  coletor_opcionais?: OpcionalSelecionado[];
  coletor_voltagem?: string;
  coletor_frequencia?: string;
  coletor_qt_motor?: number;
  coletor_marca_contactores?: string;
  coletor_distancia_hidraulica?: number;
  coletor_distancia_ciclone?: number;
  coletor_tipo_escada?: string;
  coletor_acionamento_comando?: string;
  coletor_qt_fio_controle?: number;
  coletor_diametro_tubo?: string;
  coletor_modelo?: string;
  coletor_outros_requisitos?: string;
  coletor_observacoes?: string;
  coletor_preco_base?: number;
  coletor_subtotal_opcionais?: number;
  coletor_subtotal?: number;
  coletor_quantidade?: number;
  coletor_preco_equipamento?: number;
  coletor_total_geral?: number;
  coletor_forma_pagamento?: string;

  // COMERCIAL
  desconto_percentual?: number;
  desconto_valor?: number;
  desconto_aprovado_por?: number;
  desconto_aprovado_em?: string;
  comissao_percentual?: number;
  comissao_valor?: number;
  frete_tipo?: FreteTipo;
  frete_valor?: number;
  garantia_meses?: number;
  qt_deslocamentos?: number;
  valor_diaria?: number;
  valor_equipamento?: number;
  valor_opcionais?: number;
  valor_servicos?: number;
  valor_desconto?: number;
  valor_total?: number;
  margem_estimada?: number;
  comissao_estimada?: number;

  // LIBERAÇÃO
  liberacao_dados_cliente_ok?: boolean;
  liberacao_local_entrega_ok?: boolean;
  liberacao_prazo_ok?: boolean;
  liberacao_pagamento_ok?: boolean;
  liberacao_observacoes_ok?: boolean;
  liberacao_outros_requisitos_ok?: boolean;
  liberacao_todos_criterios_ok?: boolean;
  liberacao_acao_necessaria?: string;
  liberacao_data?: string;
  liberacao_usuario_id?: number;

  // FECHAMENTO
  fechamento_data?: string;
  fechamento_concorrente?: string;
  fechamento_motivo?: string;
  fechamento_justificativa?: string;

  // OPD
  opd_numero?: number;
  opd_criada_em?: string;

  // ANEXOS
  anexos?: Array<{
    url: string;
    nome: string;
    descricao?: string;
    tipo?: string;
  }>;
  pdf_url?: string;
  pdf_gerado_em?: string;

  // IA
  ia_sugestao_config?: Record<string, unknown>;
  ia_sugestao_aceita?: boolean;
  ia_analise?: AnaliseIA;

  // Metadados
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

// =============================================
// INTERFACES - IA
// =============================================

export interface AnaliseIA {
  // Metadata fields (from database log)
  id?: number;
  tipo?: string;
  referencia_tipo?: string;
  referencia_id?: string;
  modelo?: string;
  created_at?: Date | string;
  // Result fields (from AI analysis)
  resultado?: {
    score?: number;
    potencial?: 'MUITO_ALTO' | 'ALTO' | 'MEDIO' | 'BAIXO';
    pontosPositivos?: string[];
    pontosAtencao?: string[];
    recomendacao?: {
      produto?: ProdutoTipo;
      tamanho?: number;
      tipo?: string;
      valorEstimadoMin?: number;
      valorEstimadoMax?: number;
      justificativa?: string;
    };
    clientesSimilares?: Array<{
      nome: string;
      produto: string;
      valor: number;
      data?: string;
    }>;
    estrategia?: {
      abordagem?: string;
      argumentos?: string[];
      objecoesPrevistas?: string[];
      descontoSugerido?: { min: number; max: number };
      decisor?: string;
    };
    alertas?: string[];
    proximaAcao?: string;
  };
  // Direct fields (legacy/alternative structure)
  score?: number;
  potencial?: 'MUITO_ALTO' | 'ALTO' | 'MEDIO' | 'BAIXO';
  pontosPositivos?: string[];
  pontosAtencao?: string[];
  recomendacao?: {
    produto?: ProdutoTipo;
    tamanho?: number;
    tipo?: string;
    valorEstimadoMin?: number;
    valorEstimadoMax?: number;
    justificativa?: string;
  };
  clientesSimilares?: Array<{
    nome: string;
    produto: string;
    valor: number;
    data?: string;
  }>;
  estrategia?: {
    abordagem?: string;
    argumentos?: string[];
    objecoesPrevistas?: string[];
    descontoSugerido?: { min: number; max: number };
    decisor?: string;
  };
  alertas?: string[];
  proximaAcao?: string;
}

export interface SugestaoIA {
  id?: string;
  titulo: string;
  descricao: string;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
  tipo: 'LIGACAO' | 'EMAIL' | 'REUNIAO' | 'DOCUMENTO' | 'OUTRO';
  prazo_sugerido_dias?: number;
  estagio?: string;
  created_at?: Date;
}

export interface TemplateIA {
  id: number;
  tipo: string;
  nome: string;
  descricao?: string;
  conteudo: string;
  variaveis?: string[];
  ativo: boolean;
  created_at?: string;
}

export interface SugestaoConfiguracao {
  produto: ProdutoTipo;
  tamanho: number;
  tipo?: string;
  opcionaisRecomendados: string[];
  descontoSugerido: number;
  justificativa: string;
}

export interface RespostaObjecao {
  categoria: string;
  objecao: string;
  respostas: string[];
  argumentos?: Record<string, unknown>;
}

export interface TemplateEmail {
  id: number;
  tipo: 'EMAIL' | 'WHATSAPP' | 'LIGACAO_SCRIPT';
  momento: string;
  nome: string;
  assunto?: string;
  template: string;
  variaveis?: Array<{ nome: string; descricao: string }>;
  ativo: boolean;
}

// =============================================
// INTERFACES - DADOS CNPJ
// =============================================

export interface DadosCNPJ {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao: string;
  data_situacao?: string;
  tipo?: string;
  porte?: string;
  natureza_juridica?: string;
  cnae_principal?: {
    codigo: string;
    descricao: string;
  };
  cnaes_secundarios?: Array<{
    codigo: string;
    descricao: string;
  }>;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  telefone?: string;
  email?: string;
  capital_social?: number;
  quadro_societario?: Array<{
    nome: string;
    qualificacao: string;
  }>;
  data_abertura?: string;
  ultima_atualizacao?: string;
}

export interface EnriquecimentoCliente {
  dados_cnpj: DadosCNPJ;
  segmento_sugerido: string;
  potencial_estimado: 'ALTO' | 'MEDIO' | 'BAIXO';
  score_credito: number;
  regiao: string;
  alertas: string[];
  tags_sugeridas: string[];
  proximo_passo_sugerido: string;
}

export interface ResultadoBuscaCNPJ {
  cnpj: string;
  clienteExistente: Cliente | null;
  dadosReceita: DadosCNPJ;
  propostasSimilares: Proposta[];
  analiseIA: AnaliseIA | null;
}

// =============================================
// INTERFACES - CÁLCULOS
// =============================================

export interface ResultadoCalculo {
  itens: ItemCalculo[];
  subtotal: number;
  descontos: Array<{
    descricao: string;
    percentual: number;
    valor: number;
  }>;
  totalDescontos: number;
  valorFinal: number;
  valorUnitario?: number;
  quantidade?: number;
  margemEstimada?: number;
  comissaoEstimada?: number;
  validadePreco?: number;
  observacoes?: string[];
  precoBase?: number;
  dadosTecnicos?: {
    modelo?: string;
    capacidade?: string;
    qtCilindros?: number;
    qtMotores?: number;
    qtOleo?: number;
    qtTravaChassi?: number;
    anguloInclinacao?: string;
  };
  subtotalOpcionais?: number;
  precoEquipamento?: number;
  descontoPercentual?: number;
  descontoValor?: number;
  total?: number;
  comissaoPercentual?: number;
  comissaoValor?: number;
}

export interface ConfiguracaoProposta {
  produto: ProdutoTipo;
  // Tombador
  tombadorTamanho?: TombadorTamanho;
  tombadorTipo?: TombadorTipo;
  // Coletor
  coletorGrau?: ColetorGrau;
  // Opcionais
  opcionaisSelecionados: Array<{
    codigo: string;
    quantidade: number;
  }>;
  // Comercial
  quantidade: number;
  descontoPercentual: number;
  freteValor?: number;
}

// =============================================
// INTERFACES - DASHBOARD
// =============================================

export interface DashboardResumo {
  propostasMes: {
    quantidade: number;
    valor: number;
    variacao: number;
  };
  emNegociacao: {
    quantidade: number;
    valor: number;
  };
  taxaConversao: {
    percentual: number;
    variacao: number;
  };
  metaMes: {
    meta: number;
    realizado: number;
    percentual: number;
  };
}

export interface DashboardPipeline {
  estagio: OportunidadeEstagio;
  nome: string;
  quantidade: number;
  valor: number;
  probabilidadeMedia: number;
  valorPonderado: number;
  cor: string;
}

export interface DashboardVendedor {
  id: number;
  nome: string;
  propostas: number;
  valorTotal: number;
  taxaConversao: number;
  metaAtingida: number;
}

// =============================================
// INTERFACES - METAS
// =============================================

export interface Meta {
  id: number;
  vendedor_id: number;
  vendedor_nome?: string;
  ano: number;
  mes: number;
  meta_valor?: number;
  meta_quantidade?: number;
  realizado_valor: number;
  realizado_quantidade: number;
  percentual_valor?: number;
  percentual_quantidade?: number;
}

// =============================================
// INTERFACES - INTERAÇÃO
// =============================================

export interface Interacao {
  id: number;
  cliente_id?: number;
  oportunidade_id?: number;
  proposta_id?: number;
  vendedor_id?: number;
  vendedor_nome?: string;
  tipo: string;
  descricao?: string;
  dados?: Record<string, unknown>;
  created_at: string;
}

// =============================================
// INTERFACES - FILTROS E PAGINAÇÃO
// =============================================

export interface FiltroClientes {
  busca?: string;
  vendedor_id?: number;
  status?: ClienteStatus;
  segmento?: ClienteSegmento;
  regiao?: ClienteRegiao;
  temperatura?: ClienteTemperatura;
  tags?: string[];
  ordenar_por?: string;
  ordem?: 'asc' | 'desc';
  pagina?: number;
  por_pagina?: number;
}

export interface FiltroOportunidades {
  busca?: string;
  vendedor_id?: number;
  cliente_id?: number;
  estagio?: OportunidadeEstagio;
  status?: OportunidadeStatus;
  produto?: ProdutoTipo;
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
  ordenar_por?: string;
  ordem?: 'asc' | 'desc';
  pagina?: number;
  por_pagina?: number;
}

export interface FiltroPropostas {
  busca?: string;
  vendedor_id?: number;
  cliente_id?: number;
  situacao?: PropostaSituacao;
  produto?: ProdutoTipo;
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
  ordenar_por?: string;
  ordem?: 'asc' | 'desc';
  pagina?: number;
  por_pagina?: number;
}

export interface FiltroAtividades {
  vendedor_id?: number;
  cliente_id?: number;
  tipo?: AtividadeTipo;
  status?: AtividadeStatus;
  prioridade?: AtividadePrioridade;
  data_inicio?: string;
  data_fim?: string;
  apenas_atrasadas?: boolean;
  apenas_hoje?: boolean;
  ordenar_por?: string;
  ordem?: 'asc' | 'desc';
  pagina?: number;
  por_pagina?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

// =============================================
// CONSTANTES
// =============================================

export const ESTAGIOS_PIPELINE: Array<{
  id: OportunidadeEstagio;
  nome: string;
  probabilidade: number;
  cor: string;
}> = [
  { id: 'PROSPECCAO', nome: 'Prospecção', probabilidade: 10, cor: '#94a3b8' },
  { id: 'QUALIFICACAO', nome: 'Qualificação', probabilidade: 25, cor: '#60a5fa' },
  { id: 'PROPOSTA', nome: 'Proposta Enviada', probabilidade: 50, cor: '#fbbf24' },
  { id: 'NEGOCIACAO', nome: 'Negociação', probabilidade: 75, cor: '#fb923c' },
  { id: 'FECHAMENTO', nome: 'Fechamento', probabilidade: 90, cor: '#22c55e' },
];

export const SITUACOES_PROPOSTA: Array<{
  id: PropostaSituacao;
  nome: string;
  cor: string;
}> = [
  { id: 'RASCUNHO', nome: 'Rascunho', cor: '#94a3b8' },
  { id: 'GERADA', nome: 'Gerada', cor: '#60a5fa' },
  { id: 'ENVIADA', nome: 'Enviada', cor: '#a78bfa' },
  { id: 'EM_NEGOCIACAO', nome: 'Em Negociação', cor: '#fbbf24' },
  { id: 'APROVADA', nome: 'Aprovada', cor: '#22c55e' },
  { id: 'FECHADA', nome: 'Fechada', cor: '#10b981' },
  { id: 'REJEITADA', nome: 'Rejeitada', cor: '#ef4444' },
  { id: 'PERDIDA', nome: 'Perdida', cor: '#dc2626' },
  { id: 'EXPIRADA', nome: 'Expirada', cor: '#9ca3af' },
  { id: 'CANCELADA', nome: 'Cancelada', cor: '#6b7280' },
  { id: 'SUBSTITUIDA', nome: 'Substituída', cor: '#78716c' },
];

export const SEGMENTOS_CLIENTE: Array<{
  id: ClienteSegmento;
  nome: string;
}> = [
  { id: 'COOPERATIVA', nome: 'Cooperativa' },
  { id: 'CEREALISTA', nome: 'Cerealista' },
  { id: 'AGRO', nome: 'Agronegócio' },
  { id: 'TRADING', nome: 'Trading' },
  { id: 'INDUSTRIA', nome: 'Indústria' },
  { id: 'FAZENDA', nome: 'Fazenda' },
  { id: 'OUTROS', nome: 'Outros' },
];

export const REGIOES: Array<{
  id: ClienteRegiao;
  nome: string;
  estados: string[];
}> = [
  { id: 'SUL', nome: 'Sul', estados: ['RS', 'SC', 'PR'] },
  { id: 'SUDESTE', nome: 'Sudeste', estados: ['SP', 'RJ', 'MG', 'ES'] },
  { id: 'CENTRO-OESTE', nome: 'Centro-Oeste', estados: ['MT', 'MS', 'GO', 'DF'] },
  { id: 'NORDESTE', nome: 'Nordeste', estados: ['BA', 'PE', 'CE', 'MA', 'PI', 'RN', 'PB', 'SE', 'AL'] },
  { id: 'NORTE', nome: 'Norte', estados: ['PA', 'AM', 'RO', 'AC', 'RR', 'AP', 'TO'] },
];

export const TAMANHOS_TOMBADOR: TombadorTamanho[] = [11, 12, 18, 21, 26, 30];
export const GRAUS_COLETOR: ColetorGrau[] = [180, 270, 360];
