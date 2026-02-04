const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const client = await pool.connect();

  // Ver usuario 100
  const result = await client.query("SELECT * FROM usuarios WHERE id_funcionario = '100'");
  console.log('Usuario 100:', result.rows[0]);

  if (result.rows[0]) {
    // Testar senha
    const senhaOk = await bcrypt.compare('123456789', result.rows[0].senha_hash);
    console.log('Senha 123456789 valida?', senhaOk);

    if (result.rows[0].password) {
      const senhaOk2 = await bcrypt.compare('123456789', result.rows[0].password);
      console.log('Password 123456789 valida?', senhaOk2);
    }
  }

  client.release();
  await pool.end();
}
check();
