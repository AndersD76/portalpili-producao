const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT o.titulo, o.numero_proposta, pc.vendedor_nome
      FROM crm_oportunidades o
      LEFT JOIN propostas_comerciais pc ON pc.numero_proposta = o.numero_proposta
      WHERE o.vendedor_id IS NULL
      LIMIT 15
    `);
    console.log('Sem vendedor (amostra):');
    res.rows.forEach(r => console.log('  #' + (r.numero_proposta || '?') + ' | ' + r.titulo + ' | csv_vendedor=' + (r.vendedor_nome || 'NULL')));

    const vends = await client.query('SELECT id, nome FROM crm_vendedores WHERE ativo = true ORDER BY nome');
    console.log('\nVendedores ativos:');
    vends.rows.forEach(v => console.log('  id=' + v.id + ' ' + v.nome));

    // Try to fix: match vendedor_nome from propostas_comerciais
    const fix = await client.query(`
      UPDATE crm_oportunidades o
      SET vendedor_id = v.id
      FROM propostas_comerciais pc
      JOIN crm_vendedores v ON UPPER(TRIM(v.nome)) = UPPER(TRIM(pc.vendedor_nome))
      WHERE pc.numero_proposta = o.numero_proposta
        AND o.vendedor_id IS NULL
        AND v.ativo = true
    `);
    console.log('\nFixados via propostas_comerciais.vendedor_nome: ' + fix.rowCount);

    // Check remaining
    const remaining = await client.query('SELECT COUNT(*) as total FROM crm_oportunidades WHERE vendedor_id IS NULL');
    console.log('Restantes sem vendedor: ' + remaining.rows[0].total);

    if (parseInt(remaining.rows[0].total) > 0) {
      const rem = await client.query(`
        SELECT o.titulo, o.numero_proposta, pc.vendedor_nome
        FROM crm_oportunidades o
        LEFT JOIN propostas_comerciais pc ON pc.numero_proposta = o.numero_proposta
        WHERE o.vendedor_id IS NULL
        LIMIT 10
      `);
      console.log('Ainda sem vendedor:');
      rem.rows.forEach(r => console.log('  #' + (r.numero_proposta || '?') + ' | ' + r.titulo + ' | csv=' + (r.vendedor_nome || 'NULL')));
    }
  } finally {
    client.release();
    pool.end();
  }
})();
