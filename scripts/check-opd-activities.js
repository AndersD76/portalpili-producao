const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkActivities() {
  try {
    console.log('Verificando atividades da OPD 3212025...\n');

    // Contar total de atividades
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM registros_atividades WHERE numero_opd = $1',
      ['3212025']
    );
    console.log('Total de atividades:', totalResult.rows[0].total);

    // Contar por status
    const statusResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM registros_atividades
      WHERE numero_opd = $1
      GROUP BY status
      ORDER BY status
    `, ['3212025']);

    console.log('\nDistribuição por status:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    // Verificar se há registros com status NULL
    const nullStatusResult = await pool.query(
      'SELECT COUNT(*) as count FROM registros_atividades WHERE numero_opd = $1 AND status IS NULL',
      ['3212025']
    );
    console.log('\nAtividades com status NULL:', nullStatusResult.rows[0].count);

    // Listar algumas atividades para verificação
    const sampleResult = await pool.query(
      'SELECT id, atividade, status FROM registros_atividades WHERE numero_opd = $1 ORDER BY id LIMIT 10',
      ['3212025']
    );

    console.log('\nPrimeiras 10 atividades:');
    sampleResult.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.atividade} - Status: ${row.status || 'NULL'}`);
    });

  } catch (error) {
    console.error('Erro ao verificar atividades:', error);
  } finally {
    await pool.end();
  }
}

checkActivities();
