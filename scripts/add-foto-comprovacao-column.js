const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

async function addFotoComprovacaoColumn() {
  try {
    console.log('🔧 Adicionando coluna foto_comprovacao à tabela registros_atividades...');

    await pool.query(`
      ALTER TABLE registros_atividades
      ADD COLUMN IF NOT EXISTS foto_comprovacao TEXT;
    `);

    console.log('✅ Coluna foto_comprovacao adicionada com sucesso!');
    console.log('📝 Coluna armazena foto em Base64 (data URL) do responsável pela execução');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addFotoComprovacaoColumn();
