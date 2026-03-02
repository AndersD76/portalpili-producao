const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    const r = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'crm_precos_opcoes'::regclass
    `);
    console.log('Constraints:', JSON.stringify(r.rows, null, 2));

    // Also check current data
    const data = await pool.query('SELECT id, categoria_id, codigo, nome FROM crm_precos_opcoes ORDER BY categoria_id, codigo');
    console.log('\nCurrent data:', JSON.stringify(data.rows, null, 2));
  } catch(e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
