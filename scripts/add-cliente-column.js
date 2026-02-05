require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addClienteColumn() {
  const client = await pool.connect();
  try {
    console.log('Verificando coluna cliente em registros_atividades...');

    const check = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'registros_atividades' AND column_name = 'cliente'
    `);

    if (check.rows.length === 0) {
      console.log('Adicionando coluna cliente...');
      await client.query(`
        ALTER TABLE registros_atividades
        ADD COLUMN IF NOT EXISTS cliente VARCHAR(255)
      `);
      console.log('Coluna cliente adicionada!');

      console.log('Atualizando valores de cliente a partir da tabela opds...');
      await client.query(`
        UPDATE registros_atividades ra
        SET cliente = o.cliente
        FROM opds o
        WHERE ra.numero_opd = o.numero AND ra.cliente IS NULL
      `);
      console.log('Valores de cliente atualizados!');
    } else {
      console.log('Coluna cliente ja existe!');
    }

    const verify = await client.query(`
      SELECT COUNT(*) as total, COUNT(cliente) as com_cliente
      FROM registros_atividades
    `);
    console.log('Total de registros:', verify.rows[0].total, 'Com cliente:', verify.rows[0].com_cliente);

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addClienteColumn();
