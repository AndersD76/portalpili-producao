/**
 * Integração com IA - Sistema Comercial PILI
 *
 * Utiliza a API da Anthropic (Claude) para auxiliar em todas as etapas
 * do processo comercial, desde a qualificação até o fechamento.
 */

import { query } from '../db';
import {
  AnaliseIA,
  SugestaoIA,
  TemplateIA,
  DadosCNPJ,
  Proposta,
  OportunidadeEstagio,
} from '@/types/comercial';

// ==================== CONFIGURAÇÃO ====================

interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}

function getConfig(): AnthropicConfig {
  return {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    maxTokens: 2000,
  };
}

// ==================== CHAMADA À API ====================

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function chamarClaude(
  systemPrompt: string,
  messages: Message[],
  temperature = 0.7
): Promise<string> {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro na API Anthropic: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

// ==================== ANÁLISE DE CLIENTE ====================

const SYSTEM_ANALISE_CLIENTE = `Você é um assistente comercial especializado em equipamentos agroindustriais (Tombadores e Coletores de Grãos) da empresa PILI.

Sua função é analisar dados de clientes potenciais e fornecer insights valiosos para a equipe de vendas.

Ao analisar um cliente, considere:
1. Segmento de atuação e relevância para nossos produtos
2. Porte da empresa e capacidade de investimento
3. Localização e logística de entrega
4. Potencial de compra baseado no CNAE
5. Possíveis necessidades específicas

Produtos PILI:
- Tombadores de Grãos: 11m a 30m, modelos Simples e Duplo
- Coletores de Grãos: 180°, 270° e 360°

Responda sempre em português brasileiro, de forma objetiva e profissional.`;

/**
 * Analisa dados do cliente via IA
 */
export async function analisarCliente(dadosCNPJ: DadosCNPJ): Promise<AnaliseIA> {
  const prompt = `Analise os dados deste cliente potencial e forneça insights para a equipe comercial:

**Dados do Cliente:**
- Razão Social: ${dadosCNPJ.razao_social}
- Nome Fantasia: ${dadosCNPJ.nome_fantasia}
- CNPJ: ${dadosCNPJ.cnpj}
- Situação: ${dadosCNPJ.situacao}
- Porte: ${dadosCNPJ.porte}
- CNAE Principal: ${dadosCNPJ.cnae_principal?.codigo} - ${dadosCNPJ.cnae_principal?.descricao}
- Capital Social: R$ ${dadosCNPJ.capital_social?.toLocaleString('pt-BR')}
- Localização: ${dadosCNPJ.endereco?.cidade}/${dadosCNPJ.endereco?.estado}
- Data Abertura: ${dadosCNPJ.data_abertura}

Forneça sua análise no seguinte formato JSON:
{
  "perfil_resumo": "Resumo do perfil do cliente em 2-3 frases",
  "potencial_compra": "ALTO|MEDIO|BAIXO",
  "produtos_recomendados": ["lista de produtos PILI recomendados"],
  "pontos_atencao": ["lista de pontos de atenção"],
  "abordagem_sugerida": "Sugestão de abordagem comercial",
  "perguntas_qualificacao": ["perguntas para qualificar o cliente"],
  "score_fit": 0-100
}`;

  try {
    const resposta = await chamarClaude(SYSTEM_ANALISE_CLIENTE, [
      { role: 'user', content: prompt },
    ], 0.3);

    // Extrai JSON da resposta
    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    const analise = JSON.parse(jsonMatch[0]);

    // Salva análise no banco
    const result = await query(
      `INSERT INTO crm_ia_analises
       (tipo, referencia_tipo, referencia_id, prompt, resposta, modelo, tokens_entrada, tokens_saida)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        'CLIENTE',
        'cnpj',
        dadosCNPJ.cnpj,
        prompt,
        JSON.stringify(analise),
        getConfig().model,
        prompt.length / 4, // estimativa
        resposta.length / 4,
      ]
    );

    return {
      id: result?.rows[0]?.id,
      tipo: 'CLIENTE',
      referencia_tipo: 'cnpj',
      referencia_id: dadosCNPJ.cnpj,
      resultado: analise,
      modelo: getConfig().model,
      created_at: new Date(),
    };
  } catch (error) {
    console.error('Erro ao analisar cliente:', error);
    throw error;
  }
}

// ==================== SUGESTÕES POR ESTÁGIO ====================

const SYSTEM_SUGESTOES = `Você é um assistente de vendas B2B experiente, especializado em vendas consultivas de equipamentos agroindustriais de alto valor.

Sua função é fornecer sugestões práticas e acionáveis para vendedores em cada estágio do funil de vendas.

Estágios do funil:
1. EM_ANALISE - Análise inicial, qualificar lead e entender necessidades
2. EM_NEGOCIACAO - Negociar termos, preços e condições
3. POS_NEGOCIACAO - Acompanhar fechamento, documentação e contrato
4. FECHADA - Venda concluída
5. PERDIDA - Oportunidade perdida
6. TESTE - Em período de teste/demonstração
7. SUSPENSO - Temporariamente suspenso
8. SUBSTITUIDO - Substituído por outra oportunidade

Sempre forneça sugestões específicas, acionáveis e relevantes para o contexto apresentado.`;

/**
 * Gera sugestões baseadas no estágio da oportunidade
 */
export async function gerarSugestoes(
  estagio: OportunidadeEstagio,
  contexto: {
    cliente?: Partial<DadosCNPJ>;
    historico?: string[];
    valor_estimado?: number;
    dias_no_estagio?: number;
  }
): Promise<SugestaoIA[]> {
  const prompt = `Uma oportunidade está no estágio "${estagio}". Forneça 3-5 sugestões de próximos passos.

**Contexto:**
- Cliente: ${contexto.cliente?.razao_social || 'Não informado'}
- Segmento: ${contexto.cliente?.cnae_principal?.descricao || 'Não informado'}
- Valor Estimado: ${contexto.valor_estimado ? `R$ ${contexto.valor_estimado.toLocaleString('pt-BR')}` : 'Não informado'}
- Dias no Estágio: ${contexto.dias_no_estagio || 0}
${contexto.historico?.length ? `- Histórico Recente: ${contexto.historico.join('; ')}` : ''}

Responda no formato JSON:
{
  "sugestoes": [
    {
      "titulo": "Título curto da ação",
      "descricao": "Descrição detalhada do que fazer",
      "prioridade": "ALTA|MEDIA|BAIXA",
      "tipo": "LIGACAO|EMAIL|REUNIAO|DOCUMENTO|OUTRO",
      "prazo_sugerido_dias": número
    }
  ],
  "alerta": "Alerta importante se houver (opcional)"
}`;

  try {
    const resposta = await chamarClaude(SYSTEM_SUGESTOES, [
      { role: 'user', content: prompt },
    ], 0.5);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const resultado = JSON.parse(jsonMatch[0]);

    return (resultado.sugestoes || []).map((s: SugestaoIA, index: number) => ({
      ...s,
      id: `sugestao_${Date.now()}_${index}`,
      estagio,
      created_at: new Date(),
    }));
  } catch (error) {
    console.error('Erro ao gerar sugestões:', error);
    return [];
  }
}

// ==================== GERAÇÃO DE EMAILS ====================

const SYSTEM_EMAILS = `Você é um redator comercial profissional, especializado em comunicação B2B para o setor agroindustrial.

Escreva emails profissionais, objetivos e persuasivos. Use um tom consultivo, não agressivo.

A empresa PILI fabrica equipamentos de movimentação de grãos:
- Tombadores de Grãos (11m a 30m)
- Coletores de Grãos (180° a 360°)

Diferenciais: qualidade, durabilidade, suporte técnico, financiamento BNDES.`;

/**
 * Gera email personalizado
 */
export async function gerarEmail(
  tipo: 'PRIMEIRO_CONTATO' | 'FOLLOWUP' | 'PROPOSTA' | 'NEGOCIACAO' | 'POS_VENDA',
  contexto: {
    cliente_nome: string;
    contato_nome: string;
    empresa_contato?: string;
    produto_interesse?: string;
    valor_proposta?: number;
    historico?: string;
    tom?: 'formal' | 'informal';
  }
): Promise<{ assunto: string; corpo: string }> {
  const tipoDescricao: Record<string, string> = {
    PRIMEIRO_CONTATO: 'primeiro contato com um lead qualificado',
    FOLLOWUP: 'follow-up após contato inicial sem resposta',
    PROPOSTA: 'envio de proposta comercial',
    NEGOCIACAO: 'resposta durante negociação de condições',
    POS_VENDA: 'acompanhamento pós-venda',
  };

  const prompt = `Escreva um email de ${tipoDescricao[tipo]}.

**Contexto:**
- Empresa: ${contexto.cliente_nome}
- Contato: ${contexto.contato_nome}
${contexto.empresa_contato ? `- Cargo/Área: ${contexto.empresa_contato}` : ''}
${contexto.produto_interesse ? `- Produto de Interesse: ${contexto.produto_interesse}` : ''}
${contexto.valor_proposta ? `- Valor da Proposta: R$ ${contexto.valor_proposta.toLocaleString('pt-BR')}` : ''}
${contexto.historico ? `- Histórico: ${contexto.historico}` : ''}
- Tom: ${contexto.tom || 'formal'}

Responda no formato JSON:
{
  "assunto": "Linha de assunto do email",
  "corpo": "Corpo do email completo"
}`;

  const resposta = await chamarClaude(SYSTEM_EMAILS, [
    { role: 'user', content: prompt },
  ], 0.7);

  const jsonMatch = resposta.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Erro ao gerar email');
  }

  return JSON.parse(jsonMatch[0]);
}

// ==================== TRATAMENTO DE OBJEÇÕES ====================

const SYSTEM_OBJECOES = `Você é um especialista em vendas consultivas com experiência em tratamento de objeções.

Forneça respostas para objeções comuns em vendas B2B de equipamentos de alto valor.

Princípios:
1. Nunca confronte diretamente - use a técnica "sinta, senti, descobri"
2. Transforme objeções em oportunidades de demonstrar valor
3. Use dados e cases quando possível
4. Mantenha o tom consultivo e profissional`;

/**
 * Gera resposta para objeção de cliente
 */
export async function tratarObjecao(
  objecao: string,
  contexto?: {
    tipo_produto?: string;
    valor_proposta?: number;
    concorrente_mencionado?: string;
  }
): Promise<{
  resposta_sugerida: string;
  argumentos: string[];
  pergunta_followup: string;
}> {
  const prompt = `O cliente apresentou a seguinte objeção: "${objecao}"

${contexto ? `Contexto:
- Produto: ${contexto.tipo_produto || 'Não especificado'}
- Valor: ${contexto.valor_proposta ? `R$ ${contexto.valor_proposta.toLocaleString('pt-BR')}` : 'Não informado'}
${contexto.concorrente_mencionado ? `- Concorrente mencionado: ${contexto.concorrente_mencionado}` : ''}` : ''}

Forneça uma estratégia de resposta no formato JSON:
{
  "resposta_sugerida": "Resposta completa para usar com o cliente",
  "argumentos": ["Lista de argumentos de apoio"],
  "pergunta_followup": "Pergunta para continuar a conversa"
}`;

  const resposta = await chamarClaude(SYSTEM_OBJECOES, [
    { role: 'user', content: prompt },
  ], 0.5);

  const jsonMatch = resposta.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Erro ao tratar objeção');
  }

  // Salva para aprendizado
  await query(
    `INSERT INTO crm_ia_objecoes (objecao, resposta_ia, contexto, avaliacao)
     VALUES ($1, $2, $3, $4)`,
    [objecao, resposta, JSON.stringify(contexto), null]
  );

  return JSON.parse(jsonMatch[0]);
}

// ==================== PREENCHIMENTO ASSISTIDO ====================

const SYSTEM_PREENCHIMENTO = `Você é um assistente que ajuda a preencher formulários de propostas comerciais.

Baseado nas informações fornecidas, sugira valores para campos do formulário.
Seja conservador nas sugestões - é melhor sugerir menos do que errar.`;

/**
 * Sugere preenchimento de campos da proposta
 */
export async function sugerirPreenchimento(
  camposPreenchidos: Partial<Proposta>,
  camposFaltantes: string[]
): Promise<Record<string, unknown>> {
  const prompt = `Baseado nos dados já preenchidos, sugira valores para os campos faltantes.

**Dados Preenchidos:**
${JSON.stringify(camposPreenchidos, null, 2)}

**Campos para Sugerir:**
${camposFaltantes.join(', ')}

Responda apenas com um JSON contendo sugestões para os campos que você tem confiança:
{
  "sugestoes": {
    "campo": valor_sugerido
  },
  "explicacoes": {
    "campo": "por que esta sugestão"
  }
}`;

  const resposta = await chamarClaude(SYSTEM_PREENCHIMENTO, [
    { role: 'user', content: prompt },
  ], 0.3);

  const jsonMatch = resposta.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {};
  }

  const resultado = JSON.parse(jsonMatch[0]);
  return resultado.sugestoes || {};
}

// ==================== ANÁLISE DE PROPOSTA ====================

/**
 * Analisa proposta e fornece recomendações
 */
export async function analisarProposta(proposta: Partial<Proposta>): Promise<{
  score: number;
  pontos_fortes: string[];
  pontos_melhorar: string[];
  recomendacoes: string[];
  probabilidade_fechamento: number;
}> {
  const systemPrompt = `Você é um analista de propostas comerciais experiente.
Avalie propostas e forneça feedback construtivo para aumentar chances de fechamento.`;

  const prompt = `Analise esta proposta comercial:

${JSON.stringify(proposta, null, 2)}

Forneça análise no formato JSON:
{
  "score": 0-100,
  "pontos_fortes": ["lista"],
  "pontos_melhorar": ["lista"],
  "recomendacoes": ["lista de recomendações específicas"],
  "probabilidade_fechamento": 0-100
}`;

  const resposta = await chamarClaude(systemPrompt, [
    { role: 'user', content: prompt },
  ], 0.4);

  const jsonMatch = resposta.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Erro ao analisar proposta');
  }

  return JSON.parse(jsonMatch[0]);
}

// ==================== CHAT ASSISTENTE ====================

/**
 * Chat interativo com o assistente de vendas
 */
export async function chatAssistente(
  mensagem: string,
  historicoChat: Message[],
  contexto?: {
    cliente?: string;
    oportunidade_id?: number;
    proposta_id?: number;
    vendedor_nome?: string;
    dados_reais?: string;
  }
): Promise<string> {
  const systemPrompt = `Voce e o Assistente PILI, assistente de vendas da empresa PILI, fabricante de Tombadores e Coletores de Graos.
${contexto?.vendedor_nome ? `Vendedor atual: ${contexto.vendedor_nome}` : ''}

REGRAS DE FORMATO (OBRIGATORIO, NUNCA QUEBRE ESTAS REGRAS):
1. Responda SOMENTE em texto puro, sem NENHUMA formatacao markdown
2. NAO use asteriscos (*), hashtags (#), travessoes como marcadores (-), underlines (_), crases, colchetes ou qualquer simbolo de formatacao
3. NAO use negrito, italico, titulos ou listas com marcadores
4. Quando precisar listar itens, use numeros (1, 2, 3) ou escreva em frases corridas separadas por ponto
5. Seja direto, objetivo e natural, como uma conversa falada
6. Responda em portugues brasileiro

O QUE VOCE PODE FAZER:
1. Consultar dados reais de clientes, oportunidades e propostas do vendedor
2. Informar precos e especificacoes dos produtos PILI (Tombadores de 11m a 30m, Fixo/Movel e Coletores 180, 270, 360 graus)
3. Ajudar com estrategias de vendas e proximos passos
4. Analisar o pipeline e dar insights baseados nos dados reais

REGRA CRITICA: Use EXCLUSIVAMENTE os dados reais fornecidos abaixo para responder sobre clientes, oportunidades, propostas e valores. Se a informacao nao estiver nos dados, diga claramente que nao ha registro no sistema. NUNCA invente dados, nomes de clientes, valores ou propostas.

${contexto?.dados_reais || '(Nenhum dado disponivel no momento)'}
${contexto?.cliente ? `\nContexto atual da conversa, Cliente: ${contexto.cliente}` : ''}${contexto?.oportunidade_id ? `\nOportunidade em foco: #${contexto.oportunidade_id}` : ''}${contexto?.proposta_id ? `\nProposta em foco: #${contexto.proposta_id}` : ''}`;

  const mensagens: Message[] = [
    ...historicoChat.slice(-10),
    { role: 'user', content: mensagem },
  ];

  return await chamarClaude(systemPrompt, mensagens, 0.4);
}

// ==================== TEMPLATES ====================

/**
 * Busca templates de IA do banco
 */
export async function buscarTemplates(tipo?: string): Promise<TemplateIA[]> {
  const whereClause = tipo ? 'WHERE tipo = $1 AND ativo = true' : 'WHERE ativo = true';
  const params = tipo ? [tipo] : [];

  const result = await query(
    `SELECT * FROM crm_ia_templates ${whereClause} ORDER BY nome`,
    params
  );

  return result?.rows || [];
}

/**
 * Aplica um template com variáveis
 */
export async function aplicarTemplate(
  templateId: number,
  variaveis: Record<string, string>
): Promise<string> {
  const result = await query(
    `SELECT * FROM crm_ia_templates WHERE id = $1`,
    [templateId]
  );

  if (!result?.rows[0]) {
    throw new Error('Template não encontrado');
  }

  let conteudo = result.rows[0].conteudo;

  // Substitui variáveis
  for (const [chave, valor] of Object.entries(variaveis)) {
    conteudo = conteudo.replace(new RegExp(`\\{\\{${chave}\\}\\}`, 'g'), valor);
  }

  return conteudo;
}

// ==================== MÉTRICAS E FEEDBACK ====================

/**
 * Registra feedback sobre sugestão da IA
 */
export async function registrarFeedback(
  analiseId: number,
  util: boolean,
  comentario?: string
): Promise<void> {
  await query(
    `UPDATE crm_ia_analises
     SET feedback_util = $2, feedback_comentario = $3
     WHERE id = $1`,
    [analiseId, util, comentario]
  );
}

/**
 * Obtém estatísticas de uso da IA
 */
export async function obterEstatisticas(periodo = 30): Promise<{
  total_analises: number;
  feedback_positivo: number;
  feedback_negativo: number;
  tipos_mais_usados: { tipo: string; quantidade: number }[];
  tokens_consumidos: number;
}> {
  const result = await query(
    `SELECT
      COUNT(*) as total_analises,
      SUM(CASE WHEN feedback_util = true THEN 1 ELSE 0 END) as feedback_positivo,
      SUM(CASE WHEN feedback_util = false THEN 1 ELSE 0 END) as feedback_negativo,
      SUM(tokens_entrada + tokens_saida) as tokens_consumidos
     FROM crm_ia_analises
     WHERE created_at >= NOW() - INTERVAL '${periodo} days'`
  );

  const tiposResult = await query(
    `SELECT tipo, COUNT(*) as quantidade
     FROM crm_ia_analises
     WHERE created_at >= NOW() - INTERVAL '${periodo} days'
     GROUP BY tipo
     ORDER BY quantidade DESC`
  );

  const stats = result?.rows[0] || {};

  return {
    total_analises: parseInt(stats.total_analises) || 0,
    feedback_positivo: parseInt(stats.feedback_positivo) || 0,
    feedback_negativo: parseInt(stats.feedback_negativo) || 0,
    tipos_mais_usados: tiposResult?.rows || [],
    tokens_consumidos: parseInt(stats.tokens_consumidos) || 0,
  };
}
