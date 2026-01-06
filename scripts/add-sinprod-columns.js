require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addSinprodColumns() {
  const client = await pool.connect();

  try {
    console.log('Adicionando colunas SINPROD à tabela opds...');

    // Verificar e adicionar coluna sinprod_status
    const checkStatus = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'opds' AND column_name = 'sinprod_status'
    `);

    if (checkStatus.rows.length === 0) {
      await client.query(`
        ALTER TABLE opds ADD COLUMN sinprod_status VARCHAR(50)
      `);
      console.log('Coluna sinprod_status adicionada');
    } else {
      console.log('Coluna sinprod_status já existe');
    }

    // Verificar e adicionar coluna sinprod_sync
    const checkSync = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'opds' AND column_name = 'sinprod_sync'
    `);

    if (checkSync.rows.length === 0) {
      await client.query(`
        ALTER TABLE opds ADD COLUMN sinprod_sync TIMESTAMP
      `);
      console.log('Coluna sinprod_sync adicionada');
    } else {
      console.log('Coluna sinprod_sync já existe');
    }

    console.log('Colunas SINPROD configuradas com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addSinprodColumns();
