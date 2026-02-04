const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

async function addDataEntregaColumn() {
  try {
    console.log('🔧 Adicionando coluna data_prevista_entrega à tabela opds...');

    await pool.query(`
      ALTER TABLE opds
      ADD COLUMN IF NOT EXISTS data_prevista_entrega DATE;
    `);

    console.log('✅ Coluna data_prevista_entrega adicionada com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addDataEntregaColumn();
