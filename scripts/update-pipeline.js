/**
 * Script para atualizar o pipeline (oportunidades) baseado na situação das propostas
 *
 * Mapeamento de situação da proposta para estágio do pipeline:
 * - RASCUNHO/GERADA/TESTE → PROPOSTA
 * - ENVIADA/EM_NEGOCIACAO → NEGOCIACAO
 * - APROVADA → FECHAMENTO
 * - FECHADA → GANHA (status=GANHA)
 * - REJEITADA/PERDIDA/CANCELADA → PERDIDA/CANCELADA
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

// Mapeamentos
const situacaoToEstagio = {
  'TESTE': 'PROPOSTA',
  'RASCUNHO': 'PROPOSTA',
  'GERADA': 'PROPOSTA',
  'ENVIADA': 'NEGOCIACAO',
  'EM_NEGOCIACAO': 'NEGOCIACAO',
  'APROVADA': 'FECHAMENTO',
  'FECHADA': 'FECHAMENTO',
  'REJEITADA': 'PROPOSTA',
  'PERDIDA': 'PROPOSTA',
  'CANCELADA': 'PROPOSTA',
  'EXPIRADA': 'PROPOSTA',
  'SUBSTITUIDA': 'PROPOSTA'
};

const situacaoToStatus = {
  'TESTE': 'ABERTA',
  'RASCUNHO': 'ABERTA',
  'GERADA': 'ABERTA',
  'ENVIADA': 'ABERTA',
  'EM_NEGOCIACAO': 'ABERTA',
  'APROVADA': 'ABERTA',
  'FECHADA': 'GANHA',
  'REJEITADA': 'PERDIDA',
  'PERDIDA': 'PERDIDA',
  'CANCELADA': 'CANCELADA',
  'EXPIRADA': 'PERDIDA',
  'SUBSTITUIDA': 'ABERTA'
};

async function updatePipeline() {
  const client = await pool.connect();

  try {
    console.log('=== ATUALIZANDO PIPELINE ===\n');

    // Mostrar estado atual
    const antes = await client.query(`
      SELECT estagio, status, COUNT(*) as total
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY estagio, status
    `);
    console.log('Estado ANTES:');
    antes.rows.forEach(r => console.log(`  ${r.estagio} (${r.status}): ${r.total}`));

    await client.query('BEGIN');

    // Atualizar cada oportunidade baseado na proposta vinculada
    const result = await client.query(`
      UPDATE crm_oportunidades o
      SET
        estagio = CASE p.situacao
          WHEN 'TESTE' THEN 'PROPOSTA'
          WHEN 'RASCUNHO' THEN 'PROPOSTA'
          WHEN 'GERADA' THEN 'PROPOSTA'
          WHEN 'ENVIADA' THEN 'NEGOCIACAO'
          WHEN 'EM_NEGOCIACAO' THEN 'NEGOCIACAO'
          WHEN 'APROVADA' THEN 'FECHAMENTO'
          WHEN 'FECHADA' THEN 'FECHAMENTO'
          ELSE 'PROPOSTA'
        END,
        status = CASE p.situacao
          WHEN 'FECHADA' THEN 'GANHA'
          WHEN 'REJEITADA' THEN 'PERDIDA'
          WHEN 'PERDIDA' THEN 'PERDIDA'
          WHEN 'CANCELADA' THEN 'CANCELADA'
          WHEN 'EXPIRADA' THEN 'PERDIDA'
          ELSE 'ABERTA'
        END,
        valor_estimado = COALESCE(p.valor_total, o.valor_estimado),
        updated_at = NOW()
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
      RETURNING o.id
    `);

    await client.query('COMMIT');

    console.log(`\nOportunidades atualizadas: ${result.rowCount}\n`);

    // Mostrar estado depois
    const depois = await client.query(`
      SELECT estagio, status, COUNT(*) as total, SUM(valor_estimado) as valor
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY estagio, status
    `);
    console.log('Estado DEPOIS:');
    depois.rows.forEach(r => {
      const valor = Number(r.valor) || 0;
      console.log(`  ${r.estagio} (${r.status}): ${r.total} - R$ ${valor.toLocaleString('pt-BR')}`);
    });

    // Pipeline para dashboard (apenas ABERTAS)
    const pipeline = await client.query(`
      SELECT estagio, COUNT(*) as quantidade, SUM(valor_estimado) as valor_total
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'NEGOCIACAO' THEN 4
          WHEN 'FECHAMENTO' THEN 5
        END
    `);

    console.log('\n=== PIPELINE PARA DASHBOARD ===');
    let totalOp = 0;
    let totalVal = 0;
    ['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'FECHAMENTO'].forEach(est => {
      const row = pipeline.rows.find(r => r.estagio === est);
      const qtd = row ? Number(row.quantidade) : 0;
      const val = row ? Number(row.valor_total) : 0;
      totalOp += qtd;
      totalVal += val;
      console.log(`${est}: ${qtd} oportunidades - R$ ${val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    });
    console.log(`\nTOTAL PIPELINE: ${totalOp} oportunidades - R$ ${totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERRO:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

updatePipeline();
