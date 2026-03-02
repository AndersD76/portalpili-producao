const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    await pool.query('ALTER TABLE crm_precos_opcoes ALTER COLUMN nome TYPE VARCHAR(500)');
    console.log('nome: VARCHAR(500) OK');
    await pool.query('ALTER TABLE crm_precos_opcoes ALTER COLUMN descricao TYPE VARCHAR(500)');
    console.log('descricao: VARCHAR(500) OK');
  } catch(e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
