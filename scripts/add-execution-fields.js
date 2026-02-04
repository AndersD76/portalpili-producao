const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

async function addExecutionFields() {
  try {
    console.log('🔧 Adicionando campos de execução à tabela registros_atividades...');

    await pool.query(`
      ALTER TABLE registros_atividades
      ADD COLUMN IF NOT EXISTS responsavel_execucao TEXT,
      ADD COLUMN IF NOT EXISTS data_execucao DATE,
      ADD COLUMN IF NOT EXISTS hora_execucao TIME;
    `);

    console.log('✅ Campos de execução adicionados com sucesso!');
    console.log('📝 Campos adicionados:');
    console.log('   - responsavel_execucao: Nome do responsável pela execução');
    console.log('   - data_execucao: Data da execução');
    console.log('   - hora_execucao: Hora da execução');
  } catch (error) {
    console.error('❌ Erro ao adicionar campos:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addExecutionFields();
