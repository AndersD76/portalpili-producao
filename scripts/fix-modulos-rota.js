require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixModulos() {
  const client = await pool.connect();
  try {
    // Add rota column
    await client.query(`ALTER TABLE modulos ADD COLUMN IF NOT EXISTS rota VARCHAR(255)`);
    console.log('Coluna rota adicionada!');

    // Update rota based on codigo
    await client.query(`
      UPDATE modulos SET rota = CASE
        WHEN codigo = 'PRODUCAO' THEN '/producao'
        WHEN codigo = 'QUALIDADE' THEN '/qualidade'
        WHEN codigo = 'COMERCIAL' THEN '/comercial'
        WHEN codigo = 'ADMIN' THEN '/admin'
        ELSE '/' || LOWER(codigo)
      END
    `);
    console.log('Coluna rota atualizada!');

    const res = await client.query('SELECT codigo, nome, rota, icone FROM modulos ORDER BY ordem');
    console.log('Módulos atualizados:');
    res.rows.forEach(r => console.log(`  - ${r.codigo}: rota=${r.rota}, icone=${r.icone}`));

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixModulos();
