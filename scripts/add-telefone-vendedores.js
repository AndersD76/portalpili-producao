const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    // Adicionar coluna telefone
    await pool.query(`
      ALTER TABLE crm_vendedores
      ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)
    `);
    console.log('Coluna telefone adicionada em crm_vendedores');

    // Verificar estrutura
    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'crm_vendedores'
      ORDER BY ordinal_position
    `);
    console.log('\nColunas:', cols.rows.map(c => c.column_name).join(', '));
  } catch(e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
})();
