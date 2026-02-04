require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function debugLogin() {
  try {
    const idFuncionario = '100';

    console.log(`\n=== Debug Login para ID Funcionário: ${idFuncionario} ===\n`);

    // Buscar usuário
    const result = await pool.query(`
      SELECT
        id,
        nome,
        email,
        id_funcionario,
        senha_hash,
        password,
        cargo,
        departamento,
        ativo,
        active,
        role
      FROM usuarios
      WHERE id_funcionario = $1
    `, [idFuncionario]);

    if (result.rowCount === 0) {
      console.log(`❌ Usuário com id_funcionario = '${idFuncionario}' NÃO ENCONTRADO!`);

      // Tentar como número
      const resultNum = await pool.query(`
        SELECT id, nome, id_funcionario FROM usuarios
        WHERE id_funcionario::text = $1 OR id = $2
        LIMIT 5
      `, [idFuncionario, parseInt(idFuncionario)]);

      if (resultNum.rowCount > 0) {
        console.log('\nUsuários encontrados com busca alternativa:');
        resultNum.rows.forEach(u => {
          console.log(`  ID: ${u.id}, Nome: ${u.nome}, id_funcionario: '${u.id_funcionario}'`);
        });
      }
    } else {
      const usuario = result.rows[0];
      console.log('✅ Usuário encontrado:');
      console.log(`  ID: ${usuario.id}`);
      console.log(`  Nome: ${usuario.nome}`);
      console.log(`  Email: ${usuario.email}`);
      console.log(`  ID Funcionário: '${usuario.id_funcionario}'`);
      console.log(`  Ativo: ${usuario.ativo}`);
      console.log(`  Active: ${usuario.active}`);
      console.log(`  Role: ${usuario.role}`);
      console.log(`  Senha Hash existe: ${usuario.senha_hash ? 'SIM' : 'NÃO'}`);
      console.log(`  Password existe: ${usuario.password ? 'SIM' : 'NÃO'}`);

      if (usuario.senha_hash) {
        console.log(`  Senha Hash (primeiros 30 chars): ${usuario.senha_hash.substring(0, 30)}...`);
      }

      // Verificar se ativo
      if (!usuario.ativo && !usuario.active) {
        console.log('\n⚠️  PROBLEMA: Usuário está INATIVO!');
      }

      // Testar senha comum
      const senhasTeste = ['123456', 'pili123', 'senha123', '123', 'admin', 'password'];
      console.log('\n--- Testando senhas comuns ---');

      for (const senha of senhasTeste) {
        const hash = usuario.senha_hash || usuario.password;
        if (hash) {
          const valido = await bcrypt.compare(senha, hash);
          console.log(`  Senha '${senha}': ${valido ? '✅ VÁLIDA!' : '❌ inválida'}`);
          if (valido) break;
        }
      }
    }

    // Verificar estrutura da query de login
    console.log('\n--- Simulando query de login ---');
    const loginQuery = await pool.query(`
      SELECT
        id,
        nome,
        email,
        id_funcionario,
        senha_hash,
        cargo,
        departamento,
        ativo
      FROM usuarios
      WHERE id_funcionario = $1 AND ativo = TRUE
    `, [idFuncionario]);

    console.log(`Query de login retornou: ${loginQuery.rowCount} resultado(s)`);

    if (loginQuery.rowCount === 0) {
      console.log('⚠️  A query de login não encontra o usuário!');
      console.log('   Possível causa: ativo = FALSE ou id_funcionario diferente');
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

debugLogin();
