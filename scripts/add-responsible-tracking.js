require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addColumns() {
  try {
    console.log('Conectando ao banco de dados...');

    // Adicionar colunas para rastrear quem iniciou e finalizou
    const alterTableQuery = `
      ALTER TABLE registros_atividades
      ADD COLUMN IF NOT EXISTS iniciado_por_id INTEGER,
      ADD COLUMN IF NOT EXISTS iniciado_por_nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS iniciado_por_id_funcionario VARCHAR(50),
      ADD COLUMN IF NOT EXISTS finalizado_por_id INTEGER,
      ADD COLUMN IF NOT EXISTS finalizado_por_nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS finalizado_por_id_funcionario VARCHAR(50),
      ADD COLUMN IF NOT EXISTS justificativa_reversao TEXT;
    `;

    await pool.query(alterTableQuery);
    console.log('Colunas adicionadas com sucesso!');

  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addColumns();
