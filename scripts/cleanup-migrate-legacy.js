/**
 * Remove oportunidades legadas do migrate-to-crm.js
 * que são duplicatas das criadas pelo sync (sem tamanho no titulo)
 *
 * Padrão: "TOMBADOR - Cliente" (migrate) vs "TOMBADOR 30m - Cliente" (sync)
 *
 * Executa: node scripts/cleanup-migrate-legacy.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();

  try {
    console.log('=== Limpeza de oportunidades legadas do migrate ===\n');

    // Oportunidades sem numero_proposta = vieram do migrate-to-crm.js
    // Oportunidades com numero_proposta = vieram do sync (fonte=PLANILHA)
    // Se existe uma com numero para mesmo cliente+vendedor+produto base, a sem numero é duplicata

    const legacyOps = await client.query(`
      SELECT o.id, o.titulo, o.cliente_id, o.vendedor_id, o.estagio, o.valor_estimado
      FROM crm_oportunidades o
      WHERE o.numero_proposta IS NULL
      ORDER BY o.titulo
    `);

    console.log(`Oportunidades sem numero_proposta: ${legacyOps.rows.length}\n`);

    const idsRemover = [];

    for (const op of legacyOps.rows) {
      // Extrair produto base do titulo: "TOMBADOR - Cliente" -> "TOMBADOR"
      const dashIdx = op.titulo.indexOf(' - ');
      if (dashIdx < 0) continue;

      const produtoBase = op.titulo.substring(0, dashIdx).trim(); // "TOMBADOR" ou "COLETOR"
      const clienteNome = op.titulo.substring(dashIdx + 3).trim();

      // Buscar oportunidade com numero_proposta para mesmo cliente+vendedor+produto similar
      let matchQuery;
      let matchParams;

      if (op.cliente_id) {
        matchQuery = `
          SELECT id FROM crm_oportunidades
          WHERE numero_proposta IS NOT NULL
            AND cliente_id = $1
            AND vendedor_id = $2
            AND titulo LIKE $3
            AND id != $4
          LIMIT 1
        `;
        matchParams = [op.cliente_id, op.vendedor_id, `${produtoBase}%- ${clienteNome}`, op.id];
      } else {
        // Sem cliente_id - buscar pelo titulo similar
        matchQuery = `
          SELECT id FROM crm_oportunidades
          WHERE numero_proposta IS NOT NULL
            AND vendedor_id = $1
            AND titulo LIKE $2
            AND id != $3
          LIMIT 1
        `;
        matchParams = [op.vendedor_id, `${produtoBase}%- ${clienteNome}`, op.id];
      }

      const match = await client.query(matchQuery, matchParams);

      if (match?.rows[0]) {
        console.log(`  Remover: "${op.titulo}" (id=${op.id}) → duplicata de id=${match.rows[0].id}`);
        idsRemover.push(op.id);
      }
    }

    if (idsRemover.length > 0) {
      await client.query(`UPDATE crm_atividades SET oportunidade_id = NULL WHERE oportunidade_id = ANY($1)`, [idsRemover]);
      await client.query(`UPDATE crm_propostas SET oportunidade_id = NULL WHERE oportunidade_id = ANY($1)`, [idsRemover]);
      await client.query(`DELETE FROM crm_oportunidades WHERE id = ANY($1)`, [idsRemover]);
      console.log(`\nRemovidas: ${idsRemover.length} oportunidades legadas`);
    } else {
      console.log('Nenhuma duplicata legada encontrada.');
    }

    // Resumo
    const counts = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(numero_proposta) as com_numero,
        COUNT(*) - COUNT(numero_proposta) as sem_numero
      FROM crm_oportunidades
    `);
    const r = counts.rows[0];
    console.log(`\nTotal oportunidades: ${r.total} (${r.com_numero} com numero, ${r.sem_numero} sem numero)`);

    console.log('\nConcluido!');

  } catch (error) {
    console.error('ERRO:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

run();
