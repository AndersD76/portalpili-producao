require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL nao encontrada');
    process.exit(1);
  }
  console.log('Conectando ao banco:', url.replace(/:[^:@]+@/, ':***@'));

  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

  try {
    // Testar conexao
    const test = await pool.query('SELECT NOW()');
    console.log('Conectado! Hora do servidor:', test.rows[0].now);

    // Rodar migration
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', 'add_analise_orcamento.sql'), 'utf8');

    // Executar cada statement separadamente
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      console.log('Executando:', stmt.substring(0, 60) + '...');
      await pool.query(stmt);
      console.log('  OK');
    }

    console.log('\nMigration executada com sucesso!');

    // Verificar tabela criada
    const check = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'crm_analise_orcamento'
    `);
    console.log('Tabela crm_analise_orcamento existe:', check.rows.length > 0);

    // Verificar coluna dados_configurador
    const col = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'crm_propostas' AND column_name = 'dados_configurador'
    `);
    console.log('Coluna dados_configurador existe:', col.rows.length > 0);

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

main();
