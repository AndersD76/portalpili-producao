// Script para verificar usuário e resetar senha
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAndFixUser() {
  const client = await pool.connect();
  try {
    console.log('=== Verificando usuário com id_funcionario=100 ===\n');

    // Verificar usuário
    const result = await client.query(
      'SELECT id, nome, id_funcionario, email, ativo, senha_hash, is_admin FROM usuarios WHERE id_funcionario = $1',
      ['100']
    );

    if (result.rows.length === 0) {
      console.log('Usuario com id_funcionario=100 NAO ENCONTRADO\n');

      // Listar todos os usuários
      const todos = await client.query('SELECT id, nome, id_funcionario, ativo FROM usuarios ORDER BY id LIMIT 15');
      console.log('Usuarios existentes:');
      todos.rows.forEach(u => console.log('  ID:', u.id, '| ID_FUNC:', u.id_funcionario, '| Nome:', u.nome, '| Ativo:', u.ativo));
    } else {
      const user = result.rows[0];
      console.log('Usuario encontrado:');
      console.log('  ID:', user.id);
      console.log('  Nome:', user.nome);
      console.log('  ID_Funcionario:', user.id_funcionario);
      console.log('  Email:', user.email);
      console.log('  Ativo:', user.ativo);
      console.log('  Is Admin:', user.is_admin);
      console.log('  Tem senha_hash:', !!user.senha_hash);

      // Resetar senha para 123456789
      console.log('\n=== Resetando senha para 123456789 ===');
      const novaSenhaHash = await bcrypt.hash('123456789', 10);

      await client.query(
        'UPDATE usuarios SET senha_hash = $1, ativo = true WHERE id_funcionario = $2',
        [novaSenhaHash, '100']
      );

      console.log('Senha resetada com sucesso!');
      console.log('Nova hash gerada:', novaSenhaHash.substring(0, 20) + '...');
    }
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixUser();
