const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    // Drop global unique constraint on codigo
    await pool.query('ALTER TABLE crm_precos_opcoes DROP CONSTRAINT IF EXISTS crm_precos_opcoes_codigo_key');
    console.log('Dropped global unique constraint on codigo');

    // Add composite unique index per category (COALESCE handles NULL categoria_id)
    await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS crm_precos_opcoes_cat_codigo_uniq ON crm_precos_opcoes (COALESCE(categoria_id, 0), codigo)');
    console.log('Created unique index per category + codigo');

    // Verify
    const r = await pool.query(`
      SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'crm_precos_opcoes'
    `);
    console.log('\nIndexes:', JSON.stringify(r.rows, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
