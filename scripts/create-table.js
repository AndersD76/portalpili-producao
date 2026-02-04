require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTable() {
  try {
    console.log('Conectando ao banco de dados...');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS opds (
        id SERIAL PRIMARY KEY,
        opd VARCHAR(255),
        numero VARCHAR(255) NOT NULL UNIQUE,
        data_pedido DATE,
        previsao_inicio DATE,
        previsao_termino DATE,
        inicio_producao DATE,
        tipo_opd VARCHAR(50),
        responsavel_opd VARCHAR(100),
        atividades_opd TEXT,
        anexo_pedido JSONB,
        registros_atividade TEXT,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await pool.query(createTableQuery);
    console.log('Tabela "opds" criada com sucesso!');

    // Criar índices para melhorar a performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_opds_numero ON opds(numero);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_opds_tipo ON opds(tipo_opd);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_opds_responsavel ON opds(responsavel_opd);');

    console.log('Índices criados com sucesso!');

  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTable();
