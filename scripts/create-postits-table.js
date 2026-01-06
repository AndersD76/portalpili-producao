const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createPostitTable() {
  const client = await pool.connect();

  try {
    console.log('Criando tabela postits...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS postits (
        id SERIAL PRIMARY KEY,
        opd VARCHAR(255) NOT NULL,
        descricao TEXT NOT NULL,
        responsavel VARCHAR(255) NOT NULL,
        prazo DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'pendente',
        criado_por VARCHAR(255),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tabela postits criada com sucesso!');

    // Criar índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_postits_opd ON postits(opd);
      CREATE INDEX IF NOT EXISTS idx_postits_status ON postits(status);
      CREATE INDEX IF NOT EXISTS idx_postits_prazo ON postits(prazo);
    `);

    console.log('✅ Índices criados com sucesso!');

  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createPostitTable();
