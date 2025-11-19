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
  dias_programados: number | null;
  parent_id: number | null;
  requer_formulario: boolean;
  tipo_formulario: TipoFormulario | null;
  formulario_anexo: {
    filename: string;
    url: string;
    size: number;
  } | null;
  iniciado_por_id: number | null;
  iniciado_por_nome: string | null;
  iniciado_por_id_funcionario: string | null;
  finalizado_por_id: number | null;
  finalizado_por_nome: string | null;
  finalizado_por_id_funcionario: string | null;
  justificativa_reversao: string | null;
  dias: number | null;
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
  dias_programados?: number;
  formulario_anexo?: {
    filename: string;
    url: string;
    size: number;
  };
}

// Tipos de formulários disponíveis
export type TipoFormulario =
  | 'REUNIAO_START'
  | 'PREPARACAO'
  | 'LIBERACAO_EMBARQUE';

// Todas as etapas do sistema (ordem de execução)
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
  | 'DESEMBARQUE E PRÉ INSTALAÇÃO'
  | 'LIBERAÇÃO E EMBARQUE'
  | 'INSTALAÇÃO E ENTREGA';

export interface StatusAtividade {
  total: number;
  concluidas: number;
  em_andamento: number;
  a_realizar: number;
  percentual_conclusao: number;
}

// Configuração de etapas
export interface ConfiguracaoEtapa {
  id: number;
  nome_etapa: EstagioOPD;
  ordem: number;
  responsavel_padrao: string;
  dias_padrao: number;
  requer_formulario: boolean;
  tipo_formulario: TipoFormulario | null;
  descricao: string | null;
  ativo: boolean;
  created: string;
  updated: string;
}

// Formulários preenchidos
export interface FormularioPreenchido {
  id: number;
  atividade_id: number;
  numero_opd: string;
  tipo_formulario: TipoFormulario;
  dados_formulario: any; // JSONB - estrutura varia por tipo
  anexos: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  preenchido_por: string;
  data_preenchimento: string;
  created: string;
  updated: string;
}

// Dados específicos de cada formulário

export interface DadosPreparacao {
  numero_opd: string;
  nome_cliente: string;
  modelo_equipamento: string;
  cidade_uf: string;
  data_prevista_inicio: string;
  tecnicos_designados: string;
  // Anexos obrigatórios
  doc_liberacao_montagem: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  esquema_eletrico: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  esquema_hidraulico: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  projeto_executivo: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  projeto_civil: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
}

export interface DadosLiberacaoEmbarque {
  // DOCUMENTAÇÃO
  nota_fiscal_romaneio: string; // Sim, Não, Outro (com campo de texto)
  nota_fiscal_romaneio_outro?: string;
  checklist_completo: string; // Sim, Não, Outro
  checklist_completo_outro?: string;
  manual_certificado: string; // Sim, Não, Outro
  manual_certificado_outro?: string;

  // ESTRUTURA MECÂNICA
  fixacao_partes_moveis: string; // Sim, Não, Outro
  fixacao_partes_moveis_outro?: string;
  aperto_parafusos: string; // Sim, Não, Outro
  aperto_parafusos_outro?: string;
  pecas_soltas: string; // Sim, Não, Outro
  pecas_soltas_outro?: string;
  superficies_protegidas: string; // Sim, Não, Outro
  superficies_protegidas_outro?: string;
  imagem_superficies: {
    filename: string;
    url: string;
    size: number;
  }[] | null;

  // SISTEMA HIDRÁULICO
  nivel_oleo: string; // Sim, Não, Outro
  nivel_oleo_outro?: string;
  imagem_nivel_oleo: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  conectores_protegidos: string; // Sim, Não, Outro
  conectores_protegidos_outro?: string;
  mangueiras_fixadas: string; // Sim, Não, Outro
  mangueiras_fixadas_outro?: string;

  // SISTEMA ELÉTRICO E DE CONTROLE
  painel_fechado: string; // Sim, Não, Outro
  painel_fechado_outro?: string;
  imagem_painel: {
    filename: string;
    url: string;
    size: number;
  }[] | null;
  cabos_protegidos: string; // Sim, Não, Outro
  cabos_protegidos_outro?: string;
  sensores_etiquetados: string; // Sim, Não, Outro
  sensores_etiquetados_outro?: string;

  // EMBALAGEM E TRANSPORTE
  equipamento_fixado: string; // Sim, Não, Outro
  equipamento_fixado_outro?: string;
  equipamento_protegido: string; // Sim, Não, Outro
  equipamento_protegido_outro?: string;
  imagem_carga: {
    filename: string;
    url: string;
    size: number;
  }[] | null;

  // LIBERAÇÃO
  responsavel_liberacao: string;
  data_liberacao: string;
}

/*

export interface DadosDesembarquePreInstalacao {
  nota_fiscal_conferida: boolean | null;
  serie_confere: boolean | null;
  comprovante_assinado: boolean | null;
  deformacao_riscos: boolean | null;
  vazamento_oleo: boolean | null;
  nivel_oleo_adequado: boolean | null;
  cabos_conectores_danificados: boolean | null;
  responsavel_conferencia: string;
  data_conferencia: string;
  obra_civil_acordo: boolean | null;
  desacordo_projeto: string | null;
  imagens_obra_civil: string[] | null;
  redler_elevador_dedicado: string | null;
  imagem_redler: string | null;
  distancia_viga_central: string | null;
  distancia_viga_saida: string | null;
  painel_aterrado: boolean | null;
  imagem_aterramento: string | null;
  responsavel_verificacao: string;
  data_verificacao: string;
}

export interface DadosLiberacaoEmbarque {
  nota_fiscal_presente: boolean | null;
  checklist_completo: boolean | null;
  manual_certificado: boolean | null;
  fixacao_partes_moveis: boolean | null;
  aperto_parafusos: boolean | null;
  pecas_soltas: boolean | null;
  superficies_protegidas: boolean | null;
  nivel_oleo_verificado: boolean | null;
  imagem_nivel_oleo: string | null;
  conectores_protegidos: boolean | null;
  mangueiras_fixadas: boolean | null;
  imagem_superficies: string | null;
  painel_fechado: boolean | null;
  imagem_painel: string | null;
  cabos_protegidos: boolean | null;
  sensores_etiquetados: boolean | null;
  equipamento_fixado: boolean | null;
  equipamento_protegido: boolean | null;
  imagem_carga: string | null;
  responsavel_liberacao: string;
  data_liberacao: string;
}

export interface DadosEntrega {
  nome_fantasia_cliente: string;
  equipamento: string;
  numero_serie: string;
  articulacoes_viga_travada: string | null; // Realizado/Não realizado/Não aplicável
  cilindros_plataforma: string | null;
  quadro_comando: string | null;
  chaves_fins_curso: string | null;
  cilindros_hidraulicos_valvulas: string | null;
  pressao_sistema_hidraulico: string | null;
  ar_sistema_hidraulico: string | null;
  funcionamento_fins_curso: string | null;
  mangueiras_cabos: string | null;
  responsavel_verificacoes: string;
  data_verificacoes: string;
  plataforma_subiu: boolean | null;
  video_plataforma_subindo: string | null;
  plataforma_desceu: boolean | null;
  video_plataforma_descendo: string | null;
  testes_com_carga: boolean | null;
  teste_liquido_penetrante: boolean | null;
  vazamento_liquido: boolean | null;
  imagem_teste_liquido: string | null;
  inclinostato_funcionou: boolean | null;
  video_inclinostato: string | null;
  observacoes: string | null;
  responsavel_testes: string;
  data_testes: string;
  lista_treinamento: string | null;
  imagem_equipe_treinada: string | null;
  termo_conclusao_aceito: boolean | null;
  data_aceite: string;
  responsavel_aceite: string;
  termo_aceite_final: boolean | null;
  data_aceite_final: string;
  responsavel_aceite_final: string;
}
*/

// Notificações
export interface Notificacao {
  id: number;
  numero_opd: string;
  atividade_id: number | null;
  destinatario_email: string;
  destinatario_nome: string | null;
  assunto: string;
  mensagem: string;
  tipo: 'NOTIFICACAO_ETAPA' | 'ALERTA_ATRASO' | 'CONCLUSAO_ETAPA' | 'FORMULARIO_PENDENTE';
  status: 'PENDENTE' | 'ENVIADA' | 'ERRO';
  data_envio: string | null;
  tentativas: number;
  erro: string | null;
  created: string;
  updated: string;
}

// Configuração de emails
export interface ConfiguracaoEmail {
  id: number;
  responsavel: string;
  email: string;
  nome: string | null;
  ativo: boolean;
  created: string;
  updated: string;
}

// View de status
export interface StatusOPD {
  id: number;
  numero: string;
  tipo_opd: string;
  responsavel_opd: string;
  data_pedido: string | null;
  previsao_inicio: string | null;
  previsao_termino: string | null;
  inicio_producao: string | null;
  total_atividades: number;
  atividades_concluidas: number;
  atividades_em_andamento: number;
  atividades_a_realizar: number;
  percentual_conclusao: number;
  created: string;
  updated: string;
}

// Usuários e Autenticação
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  id_funcionario: string;
  cargo: string | null;
  departamento: string | null;
  ativo: boolean;
  created: string;
  updated: string;
}

export interface LoginRequest {
  id_funcionario: string;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  user?: Usuario;
  token?: string;
  error?: string;
}

// Auditoria
export type AcaoAuditoria = 'INICIADA' | 'CONCLUIDA' | 'PAUSADA' | 'RETOMADA' | 'EDITADA';

export interface AuditoriaAtividade {
  id: number;
  atividade_id: number;
  numero_opd: string;
  usuario_id: number;
  usuario_nome: string;
  usuario_id_funcionario: string;
  acao: AcaoAuditoria;
  status_anterior: string | null;
  status_novo: string | null;
  data_acao: string;
  observacoes: string | null;
  ip_address: string | null;
  user_agent: string | null;
  dados_alterados: any;
  created: string;
}

export interface CreateAuditoriaRequest {
  atividade_id: number;
  numero_opd: string;
  usuario_id: number;
  usuario_nome: string;
  usuario_id_funcionario: string;
  acao: AcaoAuditoria;
  status_anterior?: string;
  status_novo?: string;
  observacoes?: string;
  dados_alterados?: any;
}

// Assinaturas Digitais
export type TipoAssinatura =
  | 'RESPONSAVEL_VERIFICACAO'
  | 'RESPONSAVEL_LIBERACAO'
  | 'RESPONSAVEL_TESTE'
  | 'ACEITE_CLIENTE'
  | 'ACEITE_FINAL';

export interface AssinaturaDigital {
  id: number;
  formulario_id: number;
  usuario_id: number;
  usuario_nome: string;
  tipo_assinatura: TipoAssinatura;
  assinatura_data: string; // Base64
  ip_address: string | null;
  data_assinatura: string;
  certificado_hash: string | null;
  created: string;
}

export interface CreateAssinaturaRequest {
  formulario_id: number;
  usuario_id: number;
  usuario_nome: string;
  tipo_assinatura: TipoAssinatura;
  assinatura_data: string;
}
