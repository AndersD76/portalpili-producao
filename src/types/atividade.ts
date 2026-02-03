export interface LogAtividade {
  timestamp: string;
  usuario_nome: string;
  usuario_id?: number;
  acao: 'INICIOU' | 'PAUSOU' | 'RETOMOU' | 'FINALIZOU';
}

export interface Atividade {
  id: number;
  numero_opd: string;
  atividade: string;
  responsavel: string;
  previsao_inicio: string | null;
  data_pedido: string | null;
  data_inicio: string | null;
  data_termino: string | null;
  data_entrega: string | null;
  cadastro_opd: string | null;
  status: 'A REALIZAR' | 'EM ANDAMENTO' | 'PAUSADA' | 'CONCLUÍDA';
  status_alt: string | null;
  tempo_medio: number | null;
  tempo_medio_dias: number | null;
  observacoes: string | null;
  dias: number | null;
  parent_id: number | null;
  subtarefas?: Atividade[];
  formulario_anexo: {
    filename: string;
    url: string;
    size: number;
  } | null;
  // Timer fields
  tempo_acumulado_segundos: number | null;
  ultimo_inicio: string | null;
  logs: LogAtividade[] | null;
  created: string;
  updated: string;
  opd_cliente?: string;
}

export interface AtividadesResponse {
  success: boolean;
  data: Atividade[];
  total: number;
}

export interface UpdateAtividadeRequest {
  status?: 'A REALIZAR' | 'EM ANDAMENTO' | 'PAUSADA' | 'CONCLUÍDA';
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

// Form data types
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
  imagens_obra_civil: any;
  redler_elevador_dedicado: string | null;
  imagem_redler: any;
  distancia_viga_central: string;
  distancia_viga_saida: string;
  painel_aterrado: boolean | null;
  imagem_aterramento: any;
  responsavel_verificacao: string;
  data_verificacao: string;
}

export interface DadosEntrega {
  nome_fantasia_cliente: string;
  equipamento: string;
  numero_serie: string;
  articulacoes_viga_travada: string | null;
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
  [key: string]: any;
}

export interface DadosLiberacaoEmbarque {
  // DOCUMENTAÇÃO
  nota_fiscal_romaneio: string;
  nota_fiscal_romaneio_outro: string;
  checklist_completo: string;
  checklist_completo_outro: string;
  manual_certificado: string;
  manual_certificado_outro: string;
  // ESTRUTURA MECÂNICA
  fixacao_partes_moveis: string;
  fixacao_partes_moveis_outro: string;
  aperto_parafusos: string;
  aperto_parafusos_outro: string;
  pecas_soltas: string;
  pecas_soltas_outro: string;
  superficies_protegidas: string;
  superficies_protegidas_outro: string;
  imagem_superficies: string | null;
  // SISTEMA HIDRÁULICO
  nivel_oleo: string;
  nivel_oleo_outro: string;
  imagem_nivel_oleo: string | null;
  conectores_protegidos: string;
  conectores_protegidos_outro: string;
  mangueiras_fixadas: string;
  mangueiras_fixadas_outro: string;
  // SISTEMA ELÉTRICO E DE CONTROLE
  painel_fechado: string;
  painel_fechado_outro: string;
  imagem_painel: string | null;
  cabos_protegidos: string;
  cabos_protegidos_outro: string;
  sensores_etiquetados: string;
  sensores_etiquetados_outro: string;
  // EMBALAGEM E TRANSPORTE
  equipamento_fixado: string;
  equipamento_fixado_outro: string;
  equipamento_protegido: string;
  equipamento_protegido_outro: string;
  imagem_carga: string | null;
  // LIBERAÇÃO
  responsavel_liberacao: string;
  data_liberacao: string;
  [key: string]: any;
}

export interface DadosPreparacao {
  numero_opd: string;
  nome_cliente: string;
  modelo_equipamento: string;
  cidade_uf: string;
  data_prevista_inicio: string;
  tecnicos_designados: string;
  doc_liberacao_montagem: any;
  esquema_eletrico: any;
  esquema_hidraulico: any;
  projeto_executivo: any;
  projeto_civil: any;
  [key: string]: any;
}

export type TipoFormulario =
  | 'reuniao'
  | 'preparacao'
  | 'liberacao_embarque'
  | 'desembarque'
  | 'entrega'
  | 'instalacao'
  | 'start2'
  | 'liberacao_comercial';

export interface FormularioPreenchido {
  id: number;
  tipo: TipoFormulario;
  numero_opd: string;
  atividade_id: number;
  dados: Record<string, any>;
  dados_formulario?: Record<string, any> | string;
  preenchido_por?: string;
  data_preenchimento?: string;
  created: string;
  updated: string;
}
