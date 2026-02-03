const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  const hash = await bcrypt.hash('123456789', 10);

  console.log('Hash gerado:', hash);

  // Ver usuarios existentes
  const all = await client.query("SELECT id, nome, id_funcionario FROM usuarios LIMIT 5");
  console.log('Usuarios existentes:', all.rows);

  // Verificar se existe
  const check = await client.query("SELECT id FROM usuarios WHERE id_funcionario = '100'");

  if (check.rows.length === 0) {
    console.log('Usuario 100 nao existe, criando...');
    await client.query(`
      INSERT INTO usuarios (nome, email, id_funcionario, senha_hash, password, cargo, role, ativo)
      VALUES ('DANIEL ANDERS', 'daniel@pili.com.br', '100', $1, $1, 'Admin', 'admin', true)
    `, [hash]);
  } else {
    console.log('Atualizando usuario 100...');
    await client.query("UPDATE usuarios SET senha_hash = $1, password = $1 WHERE id_funcionario = '100'", [hash]);
  }

  const result = await client.query("SELECT id, nome, id_funcionario, senha_hash FROM usuarios WHERE id_funcionario = '100'");
  console.log('Usuario final:', result.rows[0]);

  client.release();
  await pool.end();
}
fix();
