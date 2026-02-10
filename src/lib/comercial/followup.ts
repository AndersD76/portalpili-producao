/**
 * Follow-up Automático - Sistema Comercial PILI
 *
 * Gera atividades de follow-up automaticamente quando
 * o estágio de uma oportunidade muda no pipeline.
 */

import { query } from '../db';

// ==================== CONFIGURAÇÃO POR ESTÁGIO ====================

interface FollowUpConfig {
  titulo: string;
  descricao: string;
  tipo: string;
  prazo_dias: number;
  prioridade: string;
}

const FOLLOWUP_POR_ESTAGIO: Record<string, FollowUpConfig> = {
  PROSPECCAO: {
    titulo: 'Fazer primeiro contato',
    descricao: 'Realizar primeiro contato com o prospect para entender necessidades e qualificar a oportunidade.',
    tipo: 'LIGACAO',
    prazo_dias: 2,
    prioridade: 'ALTA',
  },
  QUALIFICACAO: {
    titulo: 'Agendar reunião de qualificação',
    descricao: 'Agendar e conduzir reunião para qualificar necessidades técnicas, orçamento e prazo do cliente.',
    tipo: 'REUNIAO',
    prazo_dias: 3,
    prioridade: 'ALTA',
  },
  PROPOSTA: {
    titulo: 'Enviar proposta comercial',
    descricao: 'Elaborar e enviar proposta comercial personalizada com base nas necessidades levantadas.',
    tipo: 'EMAIL',
    prazo_dias: 5,
    prioridade: 'ALTA',
  },
  EM_ANALISE: {
    titulo: 'Follow-up sobre análise da proposta',
    descricao: 'Entrar em contato para verificar se há dúvidas sobre a proposta e oferecer esclarecimentos.',
    tipo: 'LIGACAO',
    prazo_dias: 7,
    prioridade: 'MEDIA',
  },
  EM_NEGOCIACAO: {
    titulo: 'Negociar condições finais',
    descricao: 'Conduzir negociação de preço, prazo e condições de pagamento para fechar o negócio.',
    tipo: 'REUNIAO',
    prazo_dias: 5,
    prioridade: 'ALTA',
  },
  FECHADA: {
    titulo: 'Pós-venda: confirmar satisfação',
    descricao: 'Contatar cliente após 30 dias para verificar satisfação com a entrega e abrir novas oportunidades.',
    tipo: 'LIGACAO',
    prazo_dias: 30,
    prioridade: 'BAIXA',
  },
};

// ==================== FUNÇÕES PRINCIPAIS ====================

/**
 * Gera atividade de follow-up para uma oportunidade com base no novo estágio
 */
export async function gerarFollowUp(
  oportunidadeId: number,
  novoEstagio: string,
  vendedorId?: number
): Promise<{ created: boolean; atividade_id?: number; message: string }> {
  const config = FOLLOWUP_POR_ESTAGIO[novoEstagio];

  if (!config) {
    return { created: false, message: `Sem follow-up configurado para estágio ${novoEstagio}` };
  }

  // Buscar dados da oportunidade
  const opp = await query(
    `SELECT o.id, o.titulo, o.vendedor_id, o.cliente_id
     FROM crm_oportunidades o
     WHERE o.id = $1`,
    [oportunidadeId]
  );

  if (!opp?.rows[0]) {
    return { created: false, message: 'Oportunidade não encontrada' };
  }

  const oportunidade = opp.rows[0];
  const vId = vendedorId || oportunidade.vendedor_id;

  // Calcular data agendada
  const dataAgendada = new Date();
  dataAgendada.setDate(dataAgendada.getDate() + config.prazo_dias);

  // Criar atividade
  const result = await query(
    `INSERT INTO crm_atividades (
      titulo, descricao, tipo, status, prioridade,
      oportunidade_id, cliente_id, vendedor_id,
      data_agendada, origem
    ) VALUES ($1, $2, $3, 'PENDENTE', $4, $5, $6, $7, $8, 'AUTO_FOLLOWUP')
    RETURNING id`,
    [
      `${config.titulo} - ${oportunidade.titulo || 'Oportunidade #' + oportunidadeId}`,
      config.descricao,
      config.tipo,
      config.prioridade,
      oportunidadeId,
      oportunidade.cliente_id,
      vId,
      dataAgendada.toISOString(),
    ]
  );

  if (result?.rows[0]) {
    return {
      created: true,
      atividade_id: result.rows[0].id,
      message: `Follow-up "${config.titulo}" criado para ${dataAgendada.toLocaleDateString('pt-BR')}`,
    };
  }

  return { created: false, message: 'Erro ao criar follow-up' };
}

/**
 * Busca oportunidades que precisam de follow-up
 * (sem atividade pendente e paradas há mais de X dias)
 */
export async function buscarOportunidadesSemFollowUp(
  vendedorId?: number,
  diasParado?: number
): Promise<Array<{
  id: number;
  titulo: string;
  estagio: string;
  cliente_nome: string;
  vendedor_nome: string;
  dias_parado: number;
  ultima_atividade: string | null;
}>> {
  const dias = diasParado || 7;

  let sql = `
    SELECT
      o.id, o.titulo, o.estagio, o.updated_at,
      c.razao_social as cliente_nome,
      v.nome as vendedor_nome,
      EXTRACT(DAY FROM NOW() - o.updated_at)::int as dias_parado,
      (SELECT MAX(a.created_at) FROM crm_atividades a WHERE a.oportunidade_id = o.id) as ultima_atividade
    FROM crm_oportunidades o
    LEFT JOIN crm_clientes c ON o.cliente_id = c.id
    LEFT JOIN crm_vendedores v ON o.vendedor_id = v.id
    WHERE o.status = 'ABERTA'
      AND o.estagio NOT IN ('FECHADA', 'PERDIDA', 'SUSPENSO')
      AND o.updated_at < NOW() - INTERVAL '1 day' * $1
      AND NOT EXISTS (
        SELECT 1 FROM crm_atividades a
        WHERE a.oportunidade_id = o.id
          AND a.status = 'PENDENTE'
      )
  `;
  const params: unknown[] = [dias];
  let paramIndex = 2;

  if (vendedorId) {
    sql += ` AND o.vendedor_id = $${paramIndex++}`;
    params.push(vendedorId);
  }

  sql += ` ORDER BY dias_parado DESC`;

  const result = await query(sql, params);
  return result?.rows || [];
}
