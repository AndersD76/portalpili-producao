const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function addMissingColumns() {
  const client = await pool.connect();

  try {
    console.log('=== Adicionando colunas faltantes em acoes_corretivas ===\n');

    const columns = [
      { name: 'data_emissao', type: 'TIMESTAMP' },
      { name: 'prazo', type: 'VARCHAR(255)' },
      { name: 'acoes_finalizadas', type: 'VARCHAR(50)' },
      { name: 'situacao_final', type: 'VARCHAR(50)' },
      { name: 'responsavel_analise', type: 'VARCHAR(255)' },
      { name: 'data_analise', type: 'TIMESTAMP' },
      { name: 'evidencias_anexos', type: 'JSONB' },
    ];

    for (const col of columns) {
      try {
        await client.query(`
          ALTER TABLE acoes_corretivas
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`+ ${col.name} (${col.type}) - OK`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`= ${col.name} - ja existe`);
        } else {
          console.log(`x ${col.name} - Erro: ${err.message}`);
        }
      }
    }

    // Preencher data_emissao a partir de data_abertura onde estiver null
    const updated = await client.query(`
      UPDATE acoes_corretivas
      SET data_emissao = data_abertura
      WHERE data_emissao IS NULL AND data_abertura IS NOT NULL
    `);
    console.log(`\nPreenchido data_emissao em ${updated.rowCount} registros`);

    console.log('\n=== Migracao concluida ===');
  } catch (error) {
    console.error('Erro na migracao:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns().catch(console.error);
