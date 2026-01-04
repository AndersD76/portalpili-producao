const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

async function addClienteColumn() {
  try {
    console.log('🔧 Adicionando coluna cliente à tabela opds...');

    await pool.query(`
      ALTER TABLE opds
      ADD COLUMN IF NOT EXISTS cliente TEXT;
    `);

    console.log('✅ Coluna cliente adicionada com sucesso!');
    console.log('📝 Coluna armazena o nome do cliente da OPD');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addClienteColumn();
