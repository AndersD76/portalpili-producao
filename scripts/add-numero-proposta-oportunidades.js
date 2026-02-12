/**
 * Adiciona coluna numero_proposta em crm_oportunidades
 * e popula com base nos titulos existentes + limpa "Venda" restantes
 *
 * Executa: node scripts/add-numero-proposta-oportunidades.js
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
    console.log('=== Adicionar numero_proposta em crm_oportunidades ===\n');

    // 1. Adicionar coluna se não existir
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'crm_oportunidades' AND column_name = 'numero_proposta'
        ) THEN
          ALTER TABLE crm_oportunidades ADD COLUMN numero_proposta VARCHAR(50);
        END IF;
      END $$
    `);
    console.log('Coluna numero_proposta: OK');

    // 2. Criar índice
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_numero_proposta
      ON crm_oportunidades(numero_proposta) WHERE numero_proposta IS NOT NULL
    `);
    console.log('Indice: OK');

    // 3. Tentar popular numero_proposta a partir de crm_propostas vinculadas
    const updated = await client.query(`
      UPDATE crm_oportunidades o
      SET numero_proposta = CAST(p.numero_proposta AS VARCHAR)
      FROM crm_propostas p
      WHERE p.oportunidade_id = o.id
        AND o.numero_proposta IS NULL
        AND p.numero_proposta IS NOT NULL
    `);
    console.log(`Populados via crm_propostas: ${updated.rowCount}`);

    // 4. Tentar popular via titulo matching com propostas_comerciais
    // Titulo formato: "TIPO_PRODUTO - CLIENTE" → buscar em propostas_comerciais
    const opsSemNum = await client.query(`
      SELECT o.id, o.titulo, o.cliente_id, o.vendedor_id
      FROM crm_oportunidades o
      WHERE o.numero_proposta IS NULL AND o.fonte = 'PLANILHA'
    `);

    let populadosViaPC = 0;
    for (const op of opsSemNum.rows) {
      // Extrair tipo_produto e cliente do titulo
      const titulo = op.titulo.replace(/^Venda /, '');
      const dashIdx = titulo.indexOf(' - ');
      if (dashIdx < 0) continue;

      const tipoProduto = titulo.substring(0, dashIdx);
      const clienteNome = titulo.substring(dashIdx + 3);

      // Buscar proposta_comercial correspondente
      const pc = await client.query(`
        SELECT REPLACE(REPLACE(numero_proposta, 'PROP-', ''), LPAD('', 0, '0'), '') as num_norm,
               numero_proposta
        FROM propostas_comerciais
        WHERE tipo_produto = $1
          AND cliente_nome = $2
          AND numero_proposta IS NOT NULL
        LIMIT 1
      `, [tipoProduto, clienteNome]);

      if (pc.rows[0]) {
        const numNorm = pc.rows[0].numero_proposta.replace(/^PROP-0*/i, '').replace(/^0+/, '');
        await client.query(
          `UPDATE crm_oportunidades SET numero_proposta = $1 WHERE id = $2`,
          [numNorm, op.id]
        );
        populadosViaPC++;
      }
    }
    console.log(`Populados via propostas_comerciais: ${populadosViaPC}`);

    // 5. Limpar oportunidades "Venda" que tem correspondente sem "Venda"
    const vendaOps = await client.query(`
      SELECT o.id, o.titulo, o.cliente_id, o.vendedor_id
      FROM crm_oportunidades o
      WHERE o.titulo LIKE 'Venda %'
    `);

    let vendaRemovidas = 0;
    const vendaIdsRemover = [];

    for (const vop of vendaOps.rows) {
      const tituloSemVenda = vop.titulo.replace(/^Venda /, '');

      // Verificar se existe uma versão sem "Venda"
      const semVenda = vop.cliente_id
        ? await client.query(
            `SELECT id FROM crm_oportunidades WHERE titulo = $1 AND cliente_id = $2 AND id != $3`,
            [tituloSemVenda, vop.cliente_id, vop.id]
          )
        : await client.query(
            `SELECT id FROM crm_oportunidades WHERE titulo = $1 AND vendedor_id = $2 AND id != $3`,
            [tituloSemVenda, vop.vendedor_id, vop.id]
          );

      if (semVenda?.rows[0]) {
        vendaIdsRemover.push(vop.id);
      }
    }

    if (vendaIdsRemover.length > 0) {
      await client.query(`UPDATE crm_atividades SET oportunidade_id = NULL WHERE oportunidade_id = ANY($1)`, [vendaIdsRemover]);
      await client.query(`UPDATE crm_propostas SET oportunidade_id = NULL WHERE oportunidade_id = ANY($1)`, [vendaIdsRemover]);
      await client.query(`DELETE FROM crm_oportunidades WHERE id = ANY($1)`, [vendaIdsRemover]);
      vendaRemovidas = vendaIdsRemover.length;
    }
    console.log(`Oportunidades "Venda" removidas (tinham versao sem Venda): ${vendaRemovidas}`);

    // 6. Renomear "Venda" restantes (sem correspondente) → remover prefixo
    const renameResult = await client.query(`
      UPDATE crm_oportunidades
      SET titulo = SUBSTRING(titulo FROM 7), updated_at = NOW()
      WHERE titulo LIKE 'Venda %'
    `);
    console.log(`Oportunidades "Venda" renomeadas (removido prefixo): ${renameResult.rowCount}`);

    // 7. Resumo final
    console.log('\n=== RESUMO ===');
    const counts = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(numero_proposta) as com_numero,
        COUNT(*) - COUNT(numero_proposta) as sem_numero,
        COUNT(CASE WHEN titulo LIKE 'Venda %' THEN 1 END) as com_venda
      FROM crm_oportunidades
    `);
    const r = counts.rows[0];
    console.log(`  Total oportunidades: ${r.total}`);
    console.log(`  Com numero_proposta: ${r.com_numero}`);
    console.log(`  Sem numero_proposta: ${r.sem_numero}`);
    console.log(`  Com "Venda" no titulo: ${r.com_venda}`);

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
