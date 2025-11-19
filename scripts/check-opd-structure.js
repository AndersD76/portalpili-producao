const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkStructure() {
  try {
    console.log('Verificando estrutura da tabela opds...\n');

    // Verificar colunas da tabela
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'opds'
      ORDER BY ordinal_position
    `);

    console.log('Colunas da tabela opds:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });

    // Verificar um registro de exemplo
    const sampleResult = await pool.query(`
      SELECT * FROM opds WHERE numero = '3212025' LIMIT 1
    `);

    if (sampleResult.rows.length > 0) {
      console.log('\nDados da OPD 3212025:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkStructure();
