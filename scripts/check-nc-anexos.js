const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  // Buscar NCs que TEM anexos
  const result = await pool.query(
    `SELECT id, numero, anexos, evidencias, created
     FROM nao_conformidades
     WHERE anexos IS NOT NULL OR evidencias IS NOT NULL
     ORDER BY created DESC
     LIMIT 10`
  );

  console.log('=== NCs Recentes ===\n');

  result.rows.forEach(nc => {
    console.log('NC: ' + nc.numero + ' (ID: ' + nc.id + ')');
    console.log('Criado: ' + new Date(nc.created).toLocaleString('pt-BR'));

    if (nc.anexos) {
      const anexos = typeof nc.anexos === 'string' ? JSON.parse(nc.anexos) : nc.anexos;
      console.log('Anexos: ' + JSON.stringify(anexos, null, 2));
    } else {
      console.log('Anexos: NENHUM');
    }

    if (nc.evidencias) {
      console.log('Evidencias: ' + JSON.stringify(nc.evidencias, null, 2));
    }

    console.log('---');
  });

  await pool.end();
}

check().catch(console.error);
