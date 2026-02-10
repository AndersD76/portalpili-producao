/**
 * Migração: Expandir estágios do pipeline
 *
 * Novos estágios baseados no Forms:
 * - PROSPECCAO (mantém)
 * - QUALIFICACAO (mantém)
 * - EM_ANALISE (novo - proposta em análise pelo cliente)
 * - EM_NEGOCIACAO (renomeia NEGOCIACAO)
 * - FECHADA (renomeia FECHAMENTO - negócio ganho)
 * - PERDIDA (proposta perdida)
 * - SUSPENSO (negociação pausada)
 * - SUBSTITUIDO (proposta substituída por outra)
 * - TESTE (dados de teste)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('=== MIGRANDO ESTÁGIOS DO PIPELINE ===\n');

    await client.query('BEGIN');

    // 1. Renomear estágios existentes
    console.log('1. Renomeando estágios existentes...');

    // NEGOCIACAO → EM_NEGOCIACAO
    await client.query(`
      UPDATE crm_oportunidades
      SET estagio = 'EM_NEGOCIACAO'
      WHERE estagio = 'NEGOCIACAO'
    `);
    console.log('   NEGOCIACAO → EM_NEGOCIACAO');

    // FECHAMENTO → FECHADA
    await client.query(`
      UPDATE crm_oportunidades
      SET estagio = 'FECHADA'
      WHERE estagio = 'FECHAMENTO'
    `);
    console.log('   FECHAMENTO → FECHADA');

    // PROPOSTA → EM_ANALISE (para propostas ENVIADAS)
    await client.query(`
      UPDATE crm_oportunidades o
      SET estagio = 'EM_ANALISE'
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
        AND p.situacao = 'ENVIADA'
        AND o.estagio = 'PROPOSTA'
    `);
    console.log('   PROPOSTA (enviadas) → EM_ANALISE');

    // 2. Atualizar propostas RASCUNHO que estão como PROPOSTA
    console.log('\n2. Mantendo PROPOSTA para rascunhos...');
    // Já está correto

    // 3. Mapear status baseado na situação da proposta
    console.log('\n3. Atualizando baseado na situação das propostas...');

    // Propostas PERDIDA → estágio PERDIDA, status PERDIDA
    const perdidas = await client.query(`
      UPDATE crm_oportunidades o
      SET estagio = 'PERDIDA', status = 'PERDIDA'
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
        AND p.situacao IN ('PERDIDA', 'REJEITADA', 'EXPIRADA')
      RETURNING o.id
    `);
    console.log(`   ${perdidas.rowCount} oportunidades → PERDIDA`);

    // Propostas CANCELADA → estágio SUSPENSO, status CANCELADA
    const canceladas = await client.query(`
      UPDATE crm_oportunidades o
      SET estagio = 'SUSPENSO', status = 'CANCELADA'
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
        AND p.situacao = 'CANCELADA'
      RETURNING o.id
    `);
    console.log(`   ${canceladas.rowCount} oportunidades → SUSPENSO`);

    // Propostas SUBSTITUIDA
    const substituidas = await client.query(`
      UPDATE crm_oportunidades o
      SET estagio = 'SUBSTITUIDO'
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
        AND p.situacao = 'SUBSTITUIDA'
      RETURNING o.id
    `);
    console.log(`   ${substituidas.rowCount} oportunidades → SUBSTITUIDO`);

    // Propostas APROVADA/FECHADA → FECHADA, status GANHA
    const ganhas = await client.query(`
      UPDATE crm_oportunidades o
      SET estagio = 'FECHADA', status = 'GANHA'
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
        AND p.situacao IN ('APROVADA', 'FECHADA')
      RETURNING o.id
    `);
    console.log(`   ${ganhas.rowCount} oportunidades → FECHADA (GANHA)`);

    await client.query('COMMIT');

    // 4. Mostrar novo estado
    console.log('\n=== NOVO ESTADO DO PIPELINE ===');
    const pipeline = await client.query(`
      SELECT estagio, status, COUNT(*) as total, SUM(valor_estimado) as valor
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
          WHEN 'PERDIDA' THEN 7
          WHEN 'SUSPENSO' THEN 8
          WHEN 'SUBSTITUIDO' THEN 9
          WHEN 'TESTE' THEN 10
        END,
        status
    `);

    pipeline.rows.forEach(r => {
      const valor = Number(r.valor) || 0;
      console.log(`${r.estagio.padEnd(15)} (${r.status.padEnd(10)}): ${String(r.total).padStart(3)} - R$ ${valor.toLocaleString('pt-BR')}`);
    });

    // Pipeline ativo (para dashboard)
    console.log('\n=== PIPELINE ATIVO (status=ABERTA) ===');
    const pipelineAtivo = await client.query(`
      SELECT estagio, COUNT(*) as total, SUM(valor_estimado) as valor
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
        END
    `);

    let totalAtivo = 0;
    let valorAtivo = 0;
    pipelineAtivo.rows.forEach(r => {
      const valor = Number(r.valor) || 0;
      totalAtivo += Number(r.total);
      valorAtivo += valor;
      console.log(`${r.estagio.padEnd(15)}: ${String(r.total).padStart(3)} - R$ ${valor.toLocaleString('pt-BR')}`);
    });
    console.log(`${'TOTAL'.padEnd(15)}: ${String(totalAtivo).padStart(3)} - R$ ${valorAtivo.toLocaleString('pt-BR')}`);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERRO:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
