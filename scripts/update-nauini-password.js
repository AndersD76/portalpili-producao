require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateNauiniPassword() {
  const client = await pool.connect();

  try {
    console.log('🔐 Atualizando senha da Nauini...\n');

    // Senha da Nauini
    const senha = '24002998';
    const senhaHash = await bcrypt.hash(senha, 10);

    // Verificar se usuário existe
    const checkResult = await client.query(`
      SELECT id, nome, id_funcionario FROM usuarios WHERE id = 2
    `);

    if (checkResult.rowCount === 0) {
      console.log('❌ Usuário Nauini (ID=2) não encontrado!');
      console.log('   Execute primeiro: node scripts/insert-usuarios.js\n');
      return;
    }

    const usuario = checkResult.rows[0];
    console.log(`✓ Usuário encontrado:`);
    console.log(`  ID: ${usuario.id}`);
    console.log(`  Nome: ${usuario.nome}`);
    console.log(`  ID Funcionário: ${usuario.id_funcionario}\n`);

    // Atualizar senha
    await client.query(`
      UPDATE usuarios
      SET senha_hash = $1, updated = $2
      WHERE id = 2
    `, [senhaHash, new Date().toISOString()]);

    console.log('✅ Senha atualizada com sucesso!\n');
    console.log('📋 Credenciais para login:');
    console.log(`   ID Funcionário: USR002`);
    console.log(`   Senha: 24002998\n`);

    // Testar a senha
    const testResult = await client.query(`
      SELECT senha_hash FROM usuarios WHERE id = 2
    `);

    const isValid = await bcrypt.compare(senha, testResult.rows[0].senha_hash);

    if (isValid) {
      console.log('✅ Senha verificada - Login funcionará!\n');
    } else {
      console.log('❌ Erro na verificação da senha\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateNauiniPassword();
