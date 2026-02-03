/**
 * Script para criar usuário administrador
 * Uso: node scripts/create-admin-user.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createAdminUser() {
  console.log('Criando usuário administrador...');

  try {
    // Configurações do admin
    const adminConfig = {
      id_funcionario: 'USR100',
      nome: 'Administrador',
      email: 'admin@pili.com.br',
      senha: '123456789',
      cargo: 'Administrador',
      departamento: 'TI',
      role: 'super_admin'
    };

    // Hash da senha
    const senha_hash = await bcrypt.hash(adminConfig.senha, 10);

    // Verificar se já existe
    const existente = await pool.query(
      'SELECT id FROM usuarios WHERE id_funcionario = $1',
      [adminConfig.id_funcionario]
    );

    if (existente.rowCount > 0) {
      console.log('Usuário admin já existe. Atualizando senha...');
      await pool.query(
        `UPDATE usuarios SET
          senha_hash = $1,
          nome = $2,
          email = $3,
          cargo = $4,
          departamento = $5,
          role = $6,
          ativo = true,
          is_admin = true
        WHERE id_funcionario = $7`,
        [
          senha_hash,
          adminConfig.nome,
          adminConfig.email,
          adminConfig.cargo,
          adminConfig.departamento,
          adminConfig.role,
          adminConfig.id_funcionario
        ]
      );
      console.log('Senha do admin atualizada com sucesso!');
    } else {
      console.log('Criando novo usuário admin...');

      // Verificar quais colunas existem
      const colsCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'usuarios'
      `);
      const existingCols = new Set(colsCheck.rows.map(r => r.column_name));

      // Construir query dinamicamente
      const fields = ['id_funcionario', 'nome', 'email', 'senha_hash', 'ativo'];
      const values = [adminConfig.id_funcionario, adminConfig.nome, adminConfig.email, senha_hash, true];

      if (existingCols.has('cargo')) {
        fields.push('cargo');
        values.push(adminConfig.cargo);
      }
      if (existingCols.has('departamento')) {
        fields.push('departamento');
        values.push(adminConfig.departamento);
      }
      if (existingCols.has('role')) {
        fields.push('role');
        values.push(adminConfig.role);
      }
      if (existingCols.has('is_admin')) {
        fields.push('is_admin');
        values.push(true);
      }
      if (existingCols.has('active')) {
        fields.push('active');
        values.push(true);
      }

      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

      await pool.query(
        `INSERT INTO usuarios (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );

      console.log('Usuário admin criado com sucesso!');
    }

    // Mostrar dados do usuário
    const admin = await pool.query(
      'SELECT id, id_funcionario, nome, email, cargo, role FROM usuarios WHERE id_funcionario = $1',
      [adminConfig.id_funcionario]
    );

    console.log('\nDados do usuário admin:');
    console.log(admin.rows[0]);
    console.log('\nLogin:');
    console.log('  ID: 100');
    console.log('  Senha: 123456789');

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();
