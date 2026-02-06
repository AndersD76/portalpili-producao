// Script para criar o usuário Daniel Anders no banco de dados
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function criarUsuario() {
  const client = await pool.connect();
  try {
    console.log('=== Criando usuário DANIEL ANDERS ===\n');

    // Verificar se já existe
    const existe = await client.query(
      'SELECT id FROM usuarios WHERE id_funcionario = $1',
      ['100']
    );

    const novaSenhaHash = await bcrypt.hash('123456789', 10);

    if (existe.rows.length > 0) {
      console.log('Usuário já existe com id_funcionario=100. Atualizando...');

      await client.query(
        'UPDATE usuarios SET senha_hash = $1, password = $1, ativo = true, active = true WHERE id_funcionario = $2',
        [novaSenhaHash, '100']
      );
      console.log('Usuário atualizado!');
    } else {
      // Criar novo usuário com todos os campos obrigatórios
      await client.query(`
        INSERT INTO usuarios (
          nome,
          email,
          password,
          role,
          id_funcionario,
          senha_hash,
          cargo,
          departamento,
          ativo,
          active,
          is_admin
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        'DANIEL ANDERS',
        'daniel.anders@pili.ind.br',
        novaSenhaHash,  // password
        'admin',        // role
        '100',          // id_funcionario
        novaSenhaHash,  // senha_hash
        'Administrador',
        'TI',
        true,           // ativo
        true,           // active
        true            // is_admin
      ]);

      console.log('Usuário criado com sucesso!');
    }

    console.log('\n  Nome: DANIEL ANDERS');
    console.log('  ID Funcionário: 100');
    console.log('  Senha: 123456789');
    console.log('  Admin: Sim');

    // Verificar
    const result = await client.query(
      'SELECT id, nome, id_funcionario, email, ativo, is_admin FROM usuarios WHERE id_funcionario = $1',
      ['100']
    );
    console.log('\n=== Usuário no banco ===');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

criarUsuario();
