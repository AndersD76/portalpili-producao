require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function resetPassword() {
  try {
    const idFuncionario = process.argv[2] || '100';
    const novaSenha = process.argv[3] || '123456';

    console.log(`\n=== Reset de Senha ===`);
    console.log(`ID Funcionário: ${idFuncionario}`);
    console.log(`Nova Senha: ${novaSenha}\n`);

    // Hash da nova senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha
    const result = await pool.query(`
      UPDATE usuarios
      SET senha_hash = $1, password = $1
      WHERE id_funcionario = $2
      RETURNING id, nome, id_funcionario
    `, [senhaHash, idFuncionario]);

    if (result.rowCount === 0) {
      console.log(`❌ Usuário com id_funcionario = '${idFuncionario}' não encontrado!`);
    } else {
      const usuario = result.rows[0];
      console.log(`✅ Senha atualizada com sucesso!`);
      console.log(`   Usuário: ${usuario.nome}`);
      console.log(`   ID Funcionário: ${usuario.id_funcionario}`);
      console.log(`\n   Para fazer login use:`);
      console.log(`   ID: ${idFuncionario}`);
      console.log(`   Senha: ${novaSenha}`);
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
