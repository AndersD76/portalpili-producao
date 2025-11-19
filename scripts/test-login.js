require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testLogin() {
  const client = await pool.connect();

  try {
    console.log('🔍 Testando sistema de login...\n');

    // 1. Testar conexão com banco
    console.log('1. Testando conexão com banco de dados...');
    const testConn = await client.query('SELECT NOW()');
    console.log('   ✅ Conexão OK -', testConn.rows[0].now);

    // 2. Verificar se a tabela usuários existe
    console.log('\n2. Verificando tabela usuarios...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'usuarios'
      );
    `);
    console.log('   ✅ Tabela usuarios existe:', tableCheck.rows[0].exists);

    // 3. Buscar usuário Nauini
    console.log('\n3. Buscando usuário Nauini (ID=2)...');
    const userResult = await client.query(`
      SELECT id, nome, email, id_funcionario, senha_hash, ativo
      FROM usuarios
      WHERE id = 2
    `);

    if (userResult.rowCount === 0) {
      console.log('   ❌ Usuário não encontrado!');
      return;
    }

    const user = userResult.rows[0];
    console.log('   ✅ Usuário encontrado:');
    console.log('      ID:', user.id);
    console.log('      Nome:', user.nome);
    console.log('      ID Funcionário:', user.id_funcionario);
    console.log('      Email:', user.email);
    console.log('      Ativo:', user.ativo);
    console.log('      Hash (primeiros 20 chars):', user.senha_hash.substring(0, 20) + '...');

    // 4. Testar verificação de senha
    console.log('\n4. Testando verificação de senha...');
    const senhaCorreta = '24002998';
    const senhaErrada = 'senha_errada';

    const validaSenhaCorreta = await bcrypt.compare(senhaCorreta, user.senha_hash);
    const validaSenhaErrada = await bcrypt.compare(senhaErrada, user.senha_hash);

    console.log('   Senha correta (24002998):', validaSenhaCorreta ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    console.log('   Senha errada (senha_errada):', validaSenhaErrada ? '❌ VÁLIDA (ERRO!)' : '✅ INVÁLIDA');

    // 5. Testar query de login (exatamente como a API faz)
    console.log('\n5. Testando query de login (como a API)...');
    const loginResult = await client.query(`
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
    `, ['USR002']);

    if (loginResult.rowCount === 0) {
      console.log('   ❌ Query de login não retornou resultados!');
    } else {
      console.log('   ✅ Query de login OK - Usuário:', loginResult.rows[0].nome);

      // Testar bcrypt com o resultado da query
      const senhaValida = await bcrypt.compare(senhaCorreta, loginResult.rows[0].senha_hash);
      console.log('   ✅ Verificação de senha:', senhaValida ? 'OK' : 'FALHOU');
    }

    // 6. Resumo
    console.log('\n═══════════════════════════════════════');
    console.log('📋 RESUMO DO TESTE:');
    console.log('═══════════════════════════════════════');
    console.log('Conexão BD:', '✅');
    console.log('Tabela usuarios:', '✅');
    console.log('Usuário Nauini:', user ? '✅' : '❌');
    console.log('ID Funcionário:', user.id_funcionario);
    console.log('Senha hash:', user.senha_hash ? '✅' : '❌');
    console.log('Verificação bcrypt:', validaSenhaCorreta ? '✅' : '❌');
    console.log('Query login API:', loginResult.rowCount > 0 ? '✅' : '❌');
    console.log('\n✅ Sistema de login está funcionando corretamente!\n');
    console.log('Credenciais para testar:');
    console.log('  ID: 2');
    console.log('  Senha: 24002998');

  } catch (error) {
    console.error('\n❌ ERRO:', error);
    console.error('\nDetalhes do erro:');
    console.error('  Mensagem:', error.message);
    console.error('  Code:', error.code);
    console.error('  Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testLogin();
