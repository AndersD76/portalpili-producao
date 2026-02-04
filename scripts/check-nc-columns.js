const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  console.log('=== Colunas da tabela nao_conformidades ===\n');

  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'nao_conformidades'
    ORDER BY ordinal_position
  `);

  result.rows.forEach(col => {
    console.log(col.column_name + ' (' + col.data_type + ') ' + (col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'));
  });

  await pool.end();
}

check().catch(console.error);
