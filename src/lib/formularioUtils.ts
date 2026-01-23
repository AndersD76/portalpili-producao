// Utilitários para manipulação de formulários com suporte a rascunho

/**
 * Obtém o nome do usuário do localStorage
 */
export function getUsuarioNome(): string {
  if (typeof window === 'undefined') return 'Sistema';

  const userDataString = localStorage.getItem('user_data');
  if (userDataString) {
    try {
      const usuario = JSON.parse(userDataString);
      return usuario.nome || 'Sistema';
    } catch {
      return 'Sistema';
    }
  }
  return 'Sistema';
}

/**
 * Carrega dados existentes de um formulário (incluindo rascunhos)
 */
export async function carregarDadosFormulario(
  endpoint: string,
  opd: string,
  atividadeId?: number
): Promise<{ dados: any; isRascunho: boolean } | null> {
  if (!atividadeId) return null;

  try {
    const response = await fetch(`/api/${endpoint}/${opd}?atividade_id=${atividadeId}`);
    const result = await response.json();

    if (result.success && result.data?.dados_formulario) {
      const dados = typeof result.data.dados_formulario === 'string'
        ? JSON.parse(result.data.dados_formulario)
        : result.data.dados_formulario;

      const isRascunho = !!dados._is_rascunho;

      // Remove campo interno _is_rascunho
      const { _is_rascunho, ...dadosLimpos } = dados;

      return { dados: dadosLimpos, isRascunho };
    }
    return null;
  } catch (err) {
    console.log('Nenhum formulário existente encontrado');
    return null;
  }
}

/**
 * Salva dados do formulário (como rascunho ou finalizado)
 */
export async function salvarFormulario(
  endpoint: string,
  opd: string,
  dados: {
    atividade_id?: number;
    dados_formulario: any;
    is_rascunho: boolean;
  }
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const response = await fetch(`/api/${endpoint}/${opd}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        atividade_id: dados.atividade_id,
        dados_formulario: dados.dados_formulario,
        preenchido_por: getUsuarioNome(),
        is_rascunho: dados.is_rascunho
      }),
    });

    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Erro ao salvar formulário:', err);
    return { success: false, error: 'Erro ao salvar formulário' };
  }
}

/**
 * Mapeia tipos de formulário para seus endpoints de API
 */
export const FORMULARIO_ENDPOINTS: Record<string, string> = {
  // Instalação
  'REUNIAO_START': 'formularios-reuniao',
  'REUNIAO_START_2': 'formularios-start2',
  'PREPARACAO': 'formularios-preparacao',
  'LIBERACAO_EMBARQUE': 'formularios-liberacao-embarque',
  'LIBERACAO_COMERCIAL': 'formularios-liberacao-comercial',
  'DESEMBARQUE': 'formularios-desembarque',
  'DESEMBARQUE_PRE_INSTALACAO': 'formularios-desembarque',
  'ENTREGA': 'formularios-entrega',
  'INSTALACAO': 'formularios-instalacao',

  // Produção - Tombador
  'CORTE': 'formularios-corte',
  'CONTROLE_QUALIDADE_CORTE': 'formularios-corte',
  'SOLDA_INFERIOR': 'formularios-solda-inferior',
  'BRACOS': 'formularios-bracos',
  'PEDESTAIS': 'formularios-pedestais',
  'CENTRAL_SUBCONJUNTOS': 'formularios-central-subconjuntos',
  'PAINEL_ELETRICO': 'formularios-painel-eletrico',
  'SOB_PLATAFORMA': 'formularios-sob-plataforma',
  'MONTAGEM': 'formularios-montagem',
  'MONTAGEM_CALHAS': 'formularios-montagem-calhas',
  'MONTAGEM_ELETRICA_HIDRAULICA': 'formularios-montagem-eletrica-hidraulica',
  'MONTAGEM_SOLDA_INFERIOR': 'formularios-montagem-solda-inferior',
  'MONTAGEM_HIDRAULICA_SOB_PLATAFORMA': 'formularios-montagem-hidraulica-sob-plataforma',
  'TRAVADOR_RODAS': 'formularios-travador-rodas',
  'CAIXA_TRAVA_CHASSI': 'formularios-caixa-trava-chassi',
  'TRAVA_CHASSI': 'formularios-trava-chassi',
  'CAVALETE_TRAVA_CHASSI': 'formularios-cavalete-trava-chassi',
  'RAMPAS': 'formularios-rampas',
  'PINTURA': 'formularios-pintura',
  'EXPEDICAO': 'formularios-expedicao',

  // Produção - Coletor
  'COLETOR_MONTAGEM_INICIAL': 'formularios-coletor-montagem-inicial',
  'COLETOR_CENTRAL_HIDRAULICA': 'formularios-coletor-central-hidraulica',
  'COLETOR_CICLONE': 'formularios-coletor-ciclone',
  'COLETOR_TUBO_COLETA': 'formularios-coletor-tubo-coleta',
  'COLETOR_COLUNA_INFERIOR': 'formularios-coletor-coluna-inferior',
  'COLETOR_COLUNA_SUPERIOR': 'formularios-coletor-coluna-superior',
  'COLETOR_ESCADA_PLATIBANDA': 'formularios-coletor-escada-platibanda',
  'COLETOR_PINTURA': 'formularios-coletor-pintura',

  // Controle de Qualidade
  'CONTROLE_QUALIDADE': 'formularios-controle-qualidade',
  'CONTROLE_QUALIDADE_CENTRAL': 'formularios-controle-qualidade-central',
  'CONTROLE_QUALIDADE_SOLDA': 'formularios-controle-qualidade-solda',
  'CONTROLE_QUALIDADE_SOLDA_LADO2': 'formularios-controle-qualidade-solda-lado2',

  // Documentos
  'OBRA_CIVIL': 'formularios-documentos',
  'ENGENHARIA_MECANICA': 'formularios-documentos',
  'ENGENHARIA_ELETRICA_HIDRAULICA': 'formularios-documentos',
  'REVISAO_PROJETOS': 'formularios-revisao-projetos',
};
