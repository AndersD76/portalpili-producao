require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addParentIdColumn() {
  const client = await pool.connect();

  try {
    console.log('Adicionando coluna parent_id à tabela registros_atividades...');

    // Adicionar coluna parent_id
    await client.query(`
      ALTER TABLE registros_atividades
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES registros_atividades(id) ON DELETE CASCADE;
    `);

    console.log('Coluna parent_id adicionada com sucesso!');

    // Criar índice para melhorar performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_atividades_parent_id ON registros_atividades(parent_id);
    `);

    console.log('Índice criado com sucesso!');

  } catch (error) {
    console.error('Erro ao adicionar coluna parent_id:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addParentIdColumn();
