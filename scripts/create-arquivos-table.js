const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS arquivos (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        tamanho INTEGER,
        dados BYTEA NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Tabela arquivos criada com sucesso');
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
