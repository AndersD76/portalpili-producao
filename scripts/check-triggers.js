require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTriggers() {
  try {
    const result = await pool.query(`
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'registros_atividades'
    `);

    console.log('Triggers on registros_atividades table:\n');
    if (result.rows.length === 0) {
      console.log('  No triggers found');
    } else {
      result.rows.forEach(row => {
        console.log(`  ${row.trigger_name}:`);
        console.log(`    Event: ${row.event_manipulation}`);
        console.log(`    Action: ${row.action_statement}\n`);
      });
    }

    // Also check a sample record to see current data_inicio/data_termino values
    const sample = await pool.query(`
      SELECT
        id,
        atividade,
        status,
        data_inicio,
        data_termino,
        dias
      FROM registros_atividades
      WHERE status = 'CONCLUÍDA'
      AND data_inicio IS NOT NULL
      AND data_termino IS NOT NULL
      LIMIT 3
    `);

    console.log('\nSample completed tasks:\n');
    sample.rows.forEach(row => {
      console.log(`  ID ${row.id}: ${row.atividade}`);
      console.log(`    Status: ${row.status}`);
      console.log(`    Início: ${row.data_inicio}`);
      console.log(`    Término: ${row.data_termino}`);
      console.log(`    Dias: ${row.dias}\n`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTriggers();
