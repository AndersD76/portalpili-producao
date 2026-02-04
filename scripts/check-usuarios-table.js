require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTable() {
  try {
    console.log('=== Verificando estrutura da tabela usuarios ===\n');

    // Buscar colunas da tabela
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `);

    console.log('Colunas da tabela usuarios:');
    console.log('-'.repeat(80));
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} | ${col.data_type.padEnd(20)} | nullable: ${col.is_nullable}`);
    });

    // Verificar quantos usuários existem
    const count = await pool.query('SELECT COUNT(*) FROM usuarios');
    console.log(`\nTotal de usuários existentes: ${count.rows[0].count}`);

    // Amostra de usuários existentes
    const sample = await pool.query(`
      SELECT id, nome, email, id_funcionario, cargo, departamento, ativo
      FROM usuarios
      LIMIT 5
    `);

    if (sample.rows.length > 0) {
      console.log('\nAmostra de usuários existentes:');
      sample.rows.forEach(u => {
        console.log(`  ID: ${u.id}, Nome: ${u.nome}, id_funcionario: ${u.id_funcionario}, ativo: ${u.ativo}`);
      });
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkTable();
