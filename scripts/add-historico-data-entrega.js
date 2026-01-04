const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

async function addHistoricoDataEntrega() {
  try {
    console.log('🔧 Adicionando coluna historico_data_entrega à tabela opds...');

    await pool.query(`
      ALTER TABLE opds
      ADD COLUMN IF NOT EXISTS historico_data_entrega JSONB DEFAULT '[]'::jsonb;
    `);

    console.log('✅ Coluna historico_data_entrega adicionada com sucesso!');
    console.log('📝 Formato do histórico:');
    console.log('   [{');
    console.log('     "data_anterior": "2024-01-15",');
    console.log('     "data_nova": "2024-01-20",');
    console.log('     "justificativa": "Atraso no fornecimento de matéria prima",');
    console.log('     "alterado_em": "2024-01-10T10:30:00Z",');
    console.log('     "alterado_por": "Nome do usuário"');
    console.log('   }]');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

addHistoricoDataEntrega();
