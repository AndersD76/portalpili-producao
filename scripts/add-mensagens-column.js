const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

async function addMensagensColumn() {
  try {
    console.log('🔧 Adicionando coluna mensagens à tabela opds...');

    await pool.query(`
      ALTER TABLE opds
      ADD COLUMN IF NOT EXISTS mensagens JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Coluna mensagens adicionada com sucesso!');
    console.log('📝 Estrutura da mensagem: { id, autor, mensagem, timestamp, lida }');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addMensagensColumn();
