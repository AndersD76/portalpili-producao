/**
 * Probabilidade Inteligente - Portal PILI
 *
 * Score ponderado baseado em metodologias de mercado:
 * - Stage-Weighted Pipeline (Salesforce/Pipedrive)
 * - Rep Performance / Win Rate (Salesforce)
 * - Deal Decay / Aging (Pipedrive)
 * - Competitive Intelligence (Gartner)
 * - Activity Velocity (HubSpot)
 * - Value Positioning
 *
 * Calibrado com dados reais do BD (522 oportunidades, 31% win rate geral).
 */

export interface ScoreInput {
  estagio: string;
  status: string;
  dias_no_estagio: number;
  valor_estimado: number;
  produto?: string;
  concorrente?: string;
  temperatura?: string;
  total_atividades: number;
  atividades_atrasadas: number;
  ultimo_contato?: string | null;
  vendedor_win_rate: number;
  vendedor_total_deals: number;
  cliente_score?: number | null;
  data_previsao_fechamento?: string | null;
}

export interface ScoreBreakdown {
  score: number;
  fatores: {
    estagio: number;
    vendedor: number;
    aging: number;
    concorrente: number;
    atividade: number;
    valor: number;
    recencia: number;
  };
}

// Stage-Weighted Pipeline (Salesforce methodology)
// Calibrated: overall win rate 31%, higher stages = higher prob
const ESTAGIO_SCORE: Record<string, number> = {
  PROSPECCAO: 5,
  QUALIFICACAO: 12,
  PROPOSTA: 15,
  EM_ANALISE: 20,
  EM_NEGOCIACAO: 28,
  POS_NEGOCIACAO: 38,
  SUSPENSO: 8,
};

// Expected days per stage before deal starts decaying (Pipedrive Deal Decay)
const DIAS_ESPERADOS: Record<string, number> = {
  PROSPECCAO: 14,
  QUALIFICACAO: 21,
  PROPOSTA: 21,
  EM_ANALISE: 30,
  EM_NEGOCIACAO: 60,
  POS_NEGOCIACAO: 21,
  SUSPENSO: 90,
};

// Median values from data analysis (for value positioning)
const MEDIANA_VALOR: Record<string, number> = {
  TOMBADOR: 476000,
  COLETOR: 96000,
};

/**
 * Calcula probabilidade inteligente para uma oportunidade.
 * Retorna score 0-100 com breakdown por fator.
 */
export function calcularProbabilidadeSmart(input: ScoreInput): ScoreBreakdown {
  const zeros = { estagio: 0, vendedor: 0, aging: 0, concorrente: 0, atividade: 0, valor: 0, recencia: 0 };

  // Estados terminais
  if (input.estagio === 'FECHADA') {
    return { score: 100, fatores: { estagio: 38, vendedor: 20, aging: 0, concorrente: 0, atividade: 10, valor: 7, recencia: 10 } };
  }
  if (['PERDIDA', 'SUBSTITUIDO', 'TESTE'].includes(input.estagio)) {
    return { score: 0, fatores: zeros };
  }

  // ── 1. ESTÁGIO (0-38pts) ── Stage-Weighted Pipeline
  const estagioScore = ESTAGIO_SCORE[input.estagio] ?? 10;

  // ── 2. WIN RATE VENDEDOR (0-20pts) ── Rep Historical Performance
  let vendedorScore = 10; // default: dados insuficientes
  if (input.vendedor_total_deals >= 3) {
    const wr = input.vendedor_win_rate;
    if (wr >= 50) vendedorScore = 20;
    else if (wr >= 35) vendedorScore = 16;
    else if (wr >= 25) vendedorScore = 12;
    else if (wr >= 15) vendedorScore = 8;
    else if (wr >= 5) vendedorScore = 4;
    else vendedorScore = 2;
  }

  // ── 3. AGING PENALTY (0 a -15pts) ── Deal Decay Rate
  let agingScore = 0;
  const diasEsperados = DIAS_ESPERADOS[input.estagio] ?? 30;
  const diasExcesso = (input.dias_no_estagio || 0) - diasEsperados;
  if (diasExcesso > 0) {
    const semanasExcesso = Math.floor(diasExcesso / 7);
    agingScore = -Math.min(semanasExcesso * 3, 15);
  }

  // ── 4. CONCORRENTE (-10 a 0pts) ── Competitive Pressure
  let concorrenteScore = 0;
  if (input.concorrente && input.concorrente.trim()) {
    const conc = input.concorrente.trim().toUpperCase();
    if (conc !== 'CANCELADO' && conc !== '') {
      concorrenteScore = -10;
    }
  }

  // ── 5. ATIVIDADES (0-10pts) ── Activity Velocity
  let atividadeScore = 2; // base: sem atividades (maioria dos deals)
  const totalAtiv = input.total_atividades || 0;
  if (totalAtiv >= 5) atividadeScore = 10;
  else if (totalAtiv >= 3) atividadeScore = 7;
  else if (totalAtiv >= 1) atividadeScore = 4;

  // Bônus negativo: atividades atrasadas
  if ((input.atividades_atrasadas || 0) > 0) {
    atividadeScore = Math.max(0, atividadeScore - 3);
  }

  // ── 6. VALOR vs MEDIANA (0-7pts) ── Value Positioning
  let valorScore = 4; // neutral
  const mediana = MEDIANA_VALOR[input.produto || 'TOMBADOR'] ?? 400000;
  const valor = input.valor_estimado || 0;
  if (valor > 0) {
    const ratio = valor / mediana;
    if (ratio >= 0.7 && ratio <= 1.5) valorScore = 7; // Faixa normal = deal sério
    else if (ratio >= 0.4) valorScore = 5;
    else if (ratio > 1.5) valorScore = 3; // Muito acima = mais difícil
    else valorScore = 2; // Muito abaixo = pode não ser sério
  }

  // ── 7. RECÊNCIA DO CONTATO (0-10pts) ── Lead Engagement Decay
  let recenciaScore = 3; // default: sem dados de contato
  if (input.ultimo_contato) {
    const diasDesdeContato = Math.floor(
      (Date.now() - new Date(input.ultimo_contato).getTime()) / 86400000
    );
    if (diasDesdeContato <= 3) recenciaScore = 10;
    else if (diasDesdeContato <= 7) recenciaScore = 8;
    else if (diasDesdeContato <= 14) recenciaScore = 5;
    else if (diasDesdeContato <= 30) recenciaScore = 3;
    else recenciaScore = 0;
  }

  // ── TOTAL ──
  const rawScore = estagioScore + vendedorScore + agingScore + concorrenteScore + atividadeScore + valorScore + recenciaScore;
  const score = Math.max(1, Math.min(95, rawScore)); // Never 0 (active) or 100 (not closed)

  return {
    score,
    fatores: {
      estagio: estagioScore,
      vendedor: vendedorScore,
      aging: agingScore,
      concorrente: concorrenteScore,
      atividade: atividadeScore,
      valor: valorScore,
      recencia: recenciaScore,
    },
  };
}
