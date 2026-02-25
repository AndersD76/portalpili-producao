/**
 * Helper compartilhado para mudança de estágio de oportunidade.
 * Usado tanto pela API interna quanto pela página pública de status check.
 */

import { query } from '../db';
import { gerarFollowUp } from './followup';

export async function registrarMudancaEstagio(
  oportunidadeId: number,
  estagioNovo: string,
  vendedorId?: number,
  origem?: string,
  skipUpdate = false
): Promise<{ followup?: unknown }> {
  // 1. Update estágio (skip se já atualizado pela query principal)
  if (!skipUpdate) {
    await query(
      `UPDATE crm_oportunidades SET estagio = $2, updated_at = NOW() WHERE id = $1`,
      [oportunidadeId, estagioNovo]
    );
  }

  // 2. Registrar interação
  const descOrigem = origem ? ` (via ${origem})` : '';
  try {
    await query(
      `INSERT INTO crm_interacoes (oportunidade_id, tipo, descricao)
       VALUES ($1, 'ANOTACAO', $2)`,
      [oportunidadeId, `Oportunidade movida para estágio: ${estagioNovo}${descOrigem}`]
    );
  } catch (e) {
    console.log('Erro ao registrar interação de estágio:', e);
  }

  // 3. Gerar follow-up automático
  let followup = null;
  if (vendedorId) {
    try {
      followup = await gerarFollowUp(oportunidadeId, estagioNovo, vendedorId);
    } catch (e) {
      console.log('Erro ao gerar follow-up automático:', e);
    }
  }

  return { followup };
}
