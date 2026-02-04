require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log('\n=== Teste de Senha ===\n');

  // Mostrar DATABASE_URL (parcial para segurança)
  const dbUrl = process.env.DATABASE_URL || '';
  const host = dbUrl.split('@')[1]?.split('/')[0] || 'não encontrado';
  console.log('Database Host:', host);

  // Verificar usuário
  const user = await pool.query(`
    SELECT id, nome, id_funcionario, senha_hash, ativo
    FROM usuarios WHERE id_funcionario = '100'
  `);

  if (user.rowCount === 0) {
    console.log('\n❌ Usuário com id_funcionario = 100 NÃO ENCONTRADO!');
    await pool.end();
    return;
  }

  const u = user.rows[0];
  console.log('\nUsuário encontrado:');
  console.log('  Nome:', u.nome);
  console.log('  ID Func:', u.id_funcionario);
  console.log('  Ativo:', u.ativo);
  console.log('  Hash existe:', u.senha_hash ? 'SIM' : 'NÃO');

  if (u.senha_hash) {
    console.log('  Hash (30 chars):', u.senha_hash.substring(0, 30) + '...');

    // Testar senhas
    console.log('\n--- Teste de Senhas ---');
    const senhasTeste = ['123456789', '123456', '24100000'];
    for (const senha of senhasTeste) {
      const valido = await bcrypt.compare(senha, u.senha_hash);
      console.log(`  '${senha}': ${valido ? '✅ VÁLIDA' : '❌ inválida'}`);
    }
  }

  await pool.end();
}

test().catch(console.error);
