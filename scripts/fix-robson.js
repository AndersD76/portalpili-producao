const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    // Fix oportunidades
    const fix1 = await client.query(`
      UPDATE crm_oportunidades SET vendedor_id = 129
      WHERE vendedor_id IS NULL
    `);
    console.log('Oportunidades fixadas: ' + fix1.rowCount);

    // Fix clientes
    const fix2 = await client.query(`
      UPDATE crm_clientes SET vendedor_id = 129
      FROM crm_oportunidades o
      WHERE o.cliente_id = crm_clientes.id
        AND o.vendedor_id = 129
        AND crm_clientes.vendedor_id IS NULL
    `);
    console.log('Clientes vinculados: ' + fix2.rowCount);

    // Verify
    const check = await client.query('SELECT COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id IS NULL');
    console.log('Sem vendedor restantes: ' + check.rows[0].total);

    const robson = await client.query('SELECT COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id = 129');
    console.log('Robson total oportunidades: ' + robson.rows[0].total);
  } finally {
    client.release();
    pool.end();
  }
})();
