/**
 * Integração com IA - Sistema de Qualidade PILI
 *
 * Utiliza a API da Anthropic (Claude) para análise de causas de não conformidades,
 * sugestão de ações corretivas e detecção de padrões.
 */

import { query } from '../db';

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
    maxTokens: 3000,
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

// ==================== ANÁLISE DE CAUSAS ====================

const SYSTEM_ANALISE_CAUSAS = `Você é um especialista em gestão da qualidade e análise de causas raiz, com profundo conhecimento em:
- Metodologia dos 5 Porquês (5 Whys)
- Diagrama de Ishikawa (Espinha de Peixe)
- Análise de Modo e Efeitos de Falha (FMEA)
- Ferramentas de qualidade (PDCA, 8D, A3)

Contexto: Você está analisando não conformidades de uma empresa que fabrica equipamentos agroindustriais (Tombadores e Coletores de Grãos).

Processos comuns da empresa:
- Fabricação de estruturas metálicas
- Soldagem de componentes
- Montagem de equipamentos
- Testes de qualidade
- Expedição e entrega

Ao analisar uma não conformidade, considere:
1. O contexto completo do problema
2. Fatores humanos, materiais, métodos, máquinas, meio ambiente e medição (6M)
3. Possíveis causas contribuintes
4. Padrões recorrentes no histórico

Responda sempre em português brasileiro, de forma técnica e objetiva.`;

/**
 * Analisa causas de uma não conformidade
 */
export async function analisarCausas(nc: {
  numero: string;
  descricao: string;
  tipo: string;
  gravidade?: string;
  local_ocorrencia?: string;
  setor_responsavel?: string;
  produtos_afetados?: string;
  evidencias?: string;
  acao_contencao?: string;
}): Promise<{
  analise_5_porques: { pergunta: string; resposta: string }[];
  causa_raiz: string;
  causas_contribuintes: { categoria: string; causa: string; probabilidade: string }[];
  diagrama_ishikawa: {
    metodo: string[];
    mao_de_obra: string[];
    maquina: string[];
    material: string[];
    meio_ambiente: string[];
    medicao: string[];
  };
  fator_humano: boolean;
  fator_sistemico: boolean;
  recomendacoes: string[];
}> {
  const prompt = `Analise as causas desta não conformidade usando metodologias de análise de causa raiz:

**Não Conformidade:**
- Número: ${nc.numero}
- Descrição: ${nc.descricao}
- Tipo: ${nc.tipo}
- Gravidade: ${nc.gravidade || 'Não informada'}
- Local: ${nc.local_ocorrencia || 'Não informado'}
- Setor Responsável: ${nc.setor_responsavel || 'Não informado'}
- Produtos Afetados: ${nc.produtos_afetados || 'Não informado'}
- Evidências: ${nc.evidencias || 'Não informadas'}
- Ação de Contenção: ${nc.acao_contencao || 'Não informada'}

Forneça sua análise no seguinte formato JSON:
{
  "analise_5_porques": [
    {"pergunta": "Por que ocorreu o problema?", "resposta": "Resposta 1"},
    {"pergunta": "Por que [resposta 1]?", "resposta": "Resposta 2"},
    {"pergunta": "Por que [resposta 2]?", "resposta": "Resposta 3"},
    {"pergunta": "Por que [resposta 3]?", "resposta": "Resposta 4"},
    {"pergunta": "Por que [resposta 4]?", "resposta": "Resposta 5 (causa raiz)"}
  ],
  "causa_raiz": "A causa raiz identificada de forma clara e objetiva",
  "causas_contribuintes": [
    {"categoria": "6M categoria", "causa": "descrição da causa", "probabilidade": "ALTA|MEDIA|BAIXA"}
  ],
  "diagrama_ishikawa": {
    "metodo": ["causas relacionadas a métodos e procedimentos"],
    "mao_de_obra": ["causas relacionadas a pessoas e treinamento"],
    "maquina": ["causas relacionadas a equipamentos"],
    "material": ["causas relacionadas a materiais e insumos"],
    "meio_ambiente": ["causas relacionadas ao ambiente de trabalho"],
    "medicao": ["causas relacionadas a instrumentação e medição"]
  },
  "fator_humano": true/false,
  "fator_sistemico": true/false,
  "recomendacoes": ["lista de recomendações para investigação adicional"]
}`;

  try {
    const resposta = await chamarClaude(SYSTEM_ANALISE_CAUSAS, [
      { role: 'user', content: prompt },
    ], 0.3);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao analisar causas:', error);
    throw error;
  }
}

// ==================== SUGESTÃO DE AÇÕES CORRETIVAS ====================

const SYSTEM_ACOES_CORRETIVAS = `Você é um especialista em gestão da qualidade com foco em ações corretivas e preventivas.

Sua função é sugerir ações corretivas eficazes baseadas na análise de causa raiz.

Ao sugerir ações, considere:
1. A ação deve atacar a causa raiz, não apenas o sintoma
2. Ações devem ser SMART (Específicas, Mensuráveis, Alcançáveis, Relevantes, com Prazo)
3. Priorize ações que previnam recorrência
4. Considere impacto vs. esforço de implementação
5. Inclua métricas de verificação de eficácia

Tipos de ação:
- CORRETIVA: Eliminar a causa do problema
- PREVENTIVA: Evitar que o problema ocorra novamente
- MELHORIA: Melhorar o processo além do necessário

Responda sempre em português brasileiro.`;

/**
 * Sugere ações corretivas para uma NC
 */
export async function sugerirAcoesCorretivas(
  nc: {
    numero: string;
    descricao: string;
    tipo: string;
    gravidade?: string;
    causa_raiz?: string;
  },
  analise?: {
    causa_raiz?: string;
    causas_contribuintes?: { categoria: string; causa: string }[];
  }
): Promise<{
  acoes: {
    tipo: 'CORRETIVA' | 'PREVENTIVA' | 'MELHORIA';
    descricao: string;
    responsavel_sugerido: string;
    prazo_sugerido_dias: number;
    prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
    recursos_necessarios: string[];
    indicador_eficacia: string;
    meta_indicador: string;
  }[];
  observacoes: string;
}> {
  const prompt = `Sugira ações corretivas para esta não conformidade:

**Não Conformidade:**
- Número: ${nc.numero}
- Descrição: ${nc.descricao}
- Tipo: ${nc.tipo}
- Gravidade: ${nc.gravidade || 'Não informada'}

**Análise de Causa:**
- Causa Raiz: ${analise?.causa_raiz || nc.causa_raiz || 'Não identificada'}
${analise?.causas_contribuintes ? `- Causas Contribuintes: ${analise.causas_contribuintes.map(c => `${c.categoria}: ${c.causa}`).join('; ')}` : ''}

Forneça as ações no seguinte formato JSON:
{
  "acoes": [
    {
      "tipo": "CORRETIVA|PREVENTIVA|MELHORIA",
      "descricao": "Descrição clara e detalhada da ação",
      "responsavel_sugerido": "Cargo ou área responsável",
      "prazo_sugerido_dias": número,
      "prioridade": "ALTA|MEDIA|BAIXA",
      "recursos_necessarios": ["lista de recursos"],
      "indicador_eficacia": "Como verificar se a ação foi eficaz",
      "meta_indicador": "Meta quantitativa do indicador"
    }
  ],
  "observacoes": "Observações gerais sobre as ações sugeridas"
}`;

  try {
    const resposta = await chamarClaude(SYSTEM_ACOES_CORRETIVAS, [
      { role: 'user', content: prompt },
    ], 0.5);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao sugerir ações:', error);
    throw error;
  }
}

// ==================== DETECÇÃO DE PADRÕES ====================

/**
 * Detecta padrões em não conformidades históricas
 */
export async function detectarPadroes(
  ncsHistoricas: {
    numero: string;
    descricao: string;
    tipo: string;
    setor_responsavel?: string;
    local_ocorrencia?: string;
    data_ocorrencia: string;
    status: string;
  }[]
): Promise<{
  padroes_identificados: {
    descricao: string;
    frequencia: number;
    setores_afetados: string[];
    periodo_concentracao?: string;
    severidade: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA';
  }[];
  tendencias: string[];
  areas_criticas: string[];
  recomendacoes_sistemicas: string[];
  alertas: string[];
}> {
  const systemPrompt = `Você é um analista de qualidade especializado em identificar padrões e tendências em dados de não conformidades.

Analise o histórico de NCs e identifique:
1. Padrões recorrentes (mesmo tipo de problema, mesmo setor, etc.)
2. Tendências temporais (aumento ou diminuição)
3. Áreas ou processos críticos
4. Correlações entre diferentes fatores

Forneça insights acionáveis para a gestão da qualidade.`;

  const prompt = `Analise o histórico de não conformidades e identifique padrões:

**Histórico de NCs (últimas ${ncsHistoricas.length} registros):**
${ncsHistoricas.map(nc => `
- [${nc.numero}] ${nc.descricao}
  Tipo: ${nc.tipo} | Setor: ${nc.setor_responsavel || 'N/A'} | Local: ${nc.local_ocorrencia || 'N/A'}
  Data: ${nc.data_ocorrencia} | Status: ${nc.status}
`).join('')}

Forneça sua análise no formato JSON:
{
  "padroes_identificados": [
    {
      "descricao": "Descrição do padrão identificado",
      "frequencia": número_de_ocorrencias,
      "setores_afetados": ["lista de setores"],
      "periodo_concentracao": "período se aplicável",
      "severidade": "CRITICA|ALTA|MEDIA|BAIXA"
    }
  ],
  "tendencias": ["lista de tendências observadas"],
  "areas_criticas": ["áreas que requerem atenção imediata"],
  "recomendacoes_sistemicas": ["ações para melhorar o sistema como um todo"],
  "alertas": ["alertas importantes para a gestão"]
}`;

  try {
    const resposta = await chamarClaude(systemPrompt, [
      { role: 'user', content: prompt },
    ], 0.4);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao detectar padrões:', error);
    throw error;
  }
}

// ==================== BUSCAR NCS SIMILARES ====================

/**
 * Busca NCs similares para auxiliar na análise
 */
export async function buscarNCsSimilares(
  ncAtual: {
    descricao: string;
    tipo: string;
    setor_responsavel?: string;
  }
): Promise<{
  ncs_similares: {
    numero: string;
    descricao: string;
    similaridade: number;
    causa_raiz?: string;
    acao_tomada?: string;
    eficaz: boolean;
  }[];
  insights: string[];
}> {
  // Busca NCs do banco para comparação
  const result = await query(`
    SELECT
      nc.numero,
      nc.descricao,
      nc.tipo,
      nc.setor_responsavel,
      ac.descricao_causa as causa_raiz,
      ac.acao_imediata as acao_tomada,
      ac.verificacao_eficacia_resultado as eficaz
    FROM nao_conformidades nc
    LEFT JOIN acoes_corretivas ac ON nc.acao_corretiva_id = ac.id
    WHERE nc.tipo = $1
    AND nc.status = 'FECHADA'
    ORDER BY nc.created DESC
    LIMIT 10
  `, [ncAtual.tipo]);

  if (!result?.rows?.length) {
    return { ncs_similares: [], insights: ['Nenhuma NC similar encontrada no histórico.'] };
  }

  const systemPrompt = `Você é um especialista em análise de similaridade de não conformidades.
Compare a NC atual com o histórico e identifique casos similares que possam ajudar na análise.`;

  const prompt = `Compare esta NC com o histórico e identifique casos similares:

**NC Atual:**
${ncAtual.descricao}
Tipo: ${ncAtual.tipo}
Setor: ${ncAtual.setor_responsavel || 'N/A'}

**Histórico de NCs do mesmo tipo:**
${result.rows.map((nc: any) => `
- [${nc.numero}] ${nc.descricao}
  Causa: ${nc.causa_raiz || 'N/A'}
  Ação: ${nc.acao_tomada || 'N/A'}
  Eficaz: ${nc.eficaz ? 'Sim' : 'Não/Pendente'}
`).join('')}

Forneça a análise no formato JSON:
{
  "ncs_similares": [
    {
      "numero": "número da NC",
      "descricao": "descrição resumida",
      "similaridade": 0-100,
      "causa_raiz": "se disponível",
      "acao_tomada": "se disponível",
      "eficaz": true/false
    }
  ],
  "insights": ["insights úteis baseados no histórico"]
}`;

  try {
    const resposta = await chamarClaude(systemPrompt, [
      { role: 'user', content: prompt },
    ], 0.3);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ncs_similares: [], insights: [] };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao buscar NCs similares:', error);
    return { ncs_similares: [], insights: [] };
  }
}

// ==================== RELATÓRIO EXECUTIVO ====================

/**
 * Gera relatório executivo de qualidade
 */
export async function gerarRelatorioExecutivo(
  periodo: { inicio: string; fim: string },
  dados: {
    total_ncs: number;
    ncs_por_tipo: { tipo: string; quantidade: number }[];
    ncs_por_gravidade: { gravidade: string; quantidade: number }[];
    tempo_medio_resolucao: number;
    taxa_reincidencia: number;
    principais_setores: { setor: string; quantidade: number }[];
  }
): Promise<{
  resumo_executivo: string;
  principais_problemas: string[];
  acoes_recomendadas: { acao: string; prioridade: string; impacto: string }[];
  metas_sugeridas: { meta: string; indicador: string; prazo: string }[];
  conclusao: string;
}> {
  const systemPrompt = `Você é um consultor de qualidade preparando um relatório executivo para a diretoria.
O relatório deve ser claro, objetivo e focado em ações.`;

  const prompt = `Gere um relatório executivo de qualidade para o período de ${periodo.inicio} a ${periodo.fim}:

**Dados do Período:**
- Total de NCs: ${dados.total_ncs}
- NCs por Tipo: ${dados.ncs_por_tipo.map(t => `${t.tipo}: ${t.quantidade}`).join(', ')}
- NCs por Gravidade: ${dados.ncs_por_gravidade.map(g => `${g.gravidade}: ${g.quantidade}`).join(', ')}
- Tempo Médio de Resolução: ${dados.tempo_medio_resolucao} dias
- Taxa de Reincidência: ${dados.taxa_reincidencia}%
- Principais Setores: ${dados.principais_setores.map(s => `${s.setor}: ${s.quantidade}`).join(', ')}

Forneça o relatório no formato JSON:
{
  "resumo_executivo": "Parágrafo resumindo a situação da qualidade no período",
  "principais_problemas": ["lista dos principais problemas identificados"],
  "acoes_recomendadas": [
    {"acao": "descrição", "prioridade": "ALTA|MEDIA|BAIXA", "impacto": "descrição do impacto"}
  ],
  "metas_sugeridas": [
    {"meta": "descrição da meta", "indicador": "como medir", "prazo": "prazo sugerido"}
  ],
  "conclusao": "Conclusão geral e próximos passos"
}`;

  try {
    const resposta = await chamarClaude(systemPrompt, [
      { role: 'user', content: prompt },
    ], 0.5);

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    throw error;
  }
}

// ==================== CHAT ASSISTENTE QUALIDADE ====================

/**
 * Chat interativo com assistente de qualidade
 */
export async function chatQualidade(
  mensagem: string,
  historicoChat: Message[],
  contexto?: {
    nc_numero?: string;
    tipo_nc?: string;
  }
): Promise<string> {
  const systemPrompt = `Você é um assistente de qualidade inteligente da PILI, especializado em:
- Análise de não conformidades
- Metodologias de qualidade (PDCA, 8D, 5 Porquês, Ishikawa)
- Ações corretivas e preventivas
- Melhoria contínua

${contexto ? `Contexto atual:
${contexto.nc_numero ? `- NC: ${contexto.nc_numero}` : ''}
${contexto.tipo_nc ? `- Tipo: ${contexto.tipo_nc}` : ''}` : ''}

Seja sempre útil, técnico e objetivo. Forneça orientações práticas baseadas nas melhores práticas de gestão da qualidade.`;

  const mensagens: Message[] = [
    ...historicoChat.slice(-10),
    { role: 'user', content: mensagem },
  ];

  return await chamarClaude(systemPrompt, mensagens, 0.7);
}

// ==================== SALVAR ANÁLISE ====================

/**
 * Salva análise de IA no banco
 */
export async function salvarAnaliseIA(
  ncId: number,
  tipo: 'CAUSAS' | 'ACOES' | 'PADROES' | 'RELATORIO',
  resultado: object
): Promise<number> {
  const result = await query(
    `INSERT INTO qualidade_ia_analises
     (nc_id, tipo, resultado, modelo, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [ncId, tipo, JSON.stringify(resultado), getConfig().model]
  );

  return result?.rows[0]?.id;
}
