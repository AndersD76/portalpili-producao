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
      CREATE TABLE IF NOT EXISTS registros_atividades (
        id SERIAL PRIMARY KEY,
        numero_opd VARCHAR(255) NOT NULL,
        atividade TEXT,
        responsavel VARCHAR(100),
        previsao_inicio DATE,
        data_pedido DATE,
        data_inicio DATE,
        data_termino DATE,
        cadastro_opd VARCHAR(255),
        status VARCHAR(50) DEFAULT 'A REALIZAR',
        status_alt VARCHAR(50),
        tempo_medio DECIMAL(10,2),
        observacoes TEXT,
        dias INTEGER,
        formulario_anexo JSONB,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_atividades_opd
          FOREIGN KEY (numero_opd)
          REFERENCES opds(numero)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `;

    await pool.query(createTableQuery);
    console.log('Tabela "registros_atividades" criada com sucesso!');

    // Criar índices para melhorar a performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_atividades_numero_opd ON registros_atividades(numero_opd);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_atividades_status ON registros_atividades(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_atividades_responsavel ON registros_atividades(responsavel);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_atividades_data_inicio ON registros_atividades(data_inicio);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_atividades_data_termino ON registros_atividades(data_termino);');

    console.log('Índices criados com sucesso!');

  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTable();
