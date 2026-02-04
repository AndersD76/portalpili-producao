require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addUserPrefix() {
  console.log('\n=== Adicionando prefixo USER ao id_funcionario ===\n');

  try {
    // Atualizar todos os id_funcionario para ter USER na frente
    // Apenas para os que são numéricos e não começam com USER
    const result = await pool.query(`
      UPDATE usuarios
      SET id_funcionario = 'USER' || id_funcionario
      WHERE id_funcionario !~ '^USER'
        AND id_funcionario ~ '^[0-9]+$'
      RETURNING id, nome, id_funcionario
    `);

    console.log(`✅ Atualizados: ${result.rowCount} usuários\n`);

    // Mostrar amostra
    console.log('Amostra:');
    result.rows.slice(0, 10).forEach(u => {
      console.log(`  ${u.id_funcionario} - ${u.nome}`);
    });

    // Verificar DANIEL ANDERS
    const daniel = await pool.query(`
      SELECT id_funcionario, nome FROM usuarios WHERE nome LIKE '%DANIEL ANDERS%'
    `);

    if (daniel.rows.length > 0) {
      console.log(`\n✅ DANIEL ANDERS: ${daniel.rows[0].id_funcionario}`);
      console.log('\nPara fazer login use:');
      console.log(`  ID: ${daniel.rows[0].id_funcionario}`);
      console.log('  Senha: 123456789');
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

addUserPrefix();
