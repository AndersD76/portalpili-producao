const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('=== Verificando Sequencias ===\n');

  try {
    const result = await pool.query(`
      SELECT sequencename, last_value
      FROM pg_sequences
      WHERE sequencename LIKE 'seq_%'
    `);

    if (result.rowCount === 0) {
      console.log('Nenhuma sequencia encontrada!');
    } else {
      result.rows.forEach(seq => {
        console.log(seq.sequencename + ': ' + seq.last_value);
      });
    }
  } catch (err) {
    console.error('Erro:', err.message);
  }

  // Tentar criar sequencia se nao existir
  console.log('\n=== Criando sequencias se nao existirem ===\n');

  try {
    await pool.query("CREATE SEQUENCE IF NOT EXISTS seq_acao_corretiva START 1");
    console.log('seq_acao_corretiva: OK');
  } catch (err) {
    console.log('seq_acao_corretiva: ' + err.message);
  }

  try {
    await pool.query("CREATE SEQUENCE IF NOT EXISTS seq_nao_conformidade START 1");
    console.log('seq_nao_conformidade: OK');
  } catch (err) {
    console.log('seq_nao_conformidade: ' + err.message);
  }

  try {
    await pool.query("CREATE SEQUENCE IF NOT EXISTS seq_reclamacao_cliente START 1");
    console.log('seq_reclamacao_cliente: OK');
  } catch (err) {
    console.log('seq_reclamacao_cliente: ' + err.message);
  }

  await pool.end();
}

check().catch(console.error);
