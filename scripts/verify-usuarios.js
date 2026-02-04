require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyUsuarios() {
  try {
    console.log('=== Verificação de Usuários Importados ===\n');

    // Total de usuários
    const total = await pool.query('SELECT COUNT(*) FROM usuarios');
    console.log(`Total de usuários no banco: ${total.rows[0].count}\n`);

    // Usuários por tipo
    const byRole = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM usuarios
      GROUP BY role
      ORDER BY count DESC
    `);
    console.log('Usuários por role:');
    byRole.rows.forEach(r => console.log(`  ${r.role || 'null'}: ${r.count}`));
    console.log('');

    // Usuários ativos
    const ativos = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ativo = true OR active = true) as ativos,
        COUNT(*) FILTER (WHERE ativo = false AND active = false) as inativos,
        COUNT(*) FILTER (WHERE ativo IS NULL AND active IS NULL) as sem_status
      FROM usuarios
    `);
    console.log('Status de ativação:');
    console.log(`  Ativos: ${ativos.rows[0].ativos}`);
    console.log(`  Inativos: ${ativos.rows[0].inativos}`);
    console.log(`  Sem status: ${ativos.rows[0].sem_status}`);
    console.log('');

    // Usuários com senha configurada
    const comSenha = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE senha_hash IS NOT NULL AND senha_hash != '') as com_senha,
        COUNT(*) FILTER (WHERE senha_hash IS NULL OR senha_hash = '') as sem_senha
      FROM usuarios
    `);
    console.log('Status de senha:');
    console.log(`  Com senha_hash: ${comSenha.rows[0].com_senha}`);
    console.log(`  Sem senha_hash: ${comSenha.rows[0].sem_senha}`);
    console.log('');

    // Amostra de usuários INTERNO (podem fazer login)
    console.log('Amostra de usuários INTERNO (funcionários):');
    const internos = await pool.query(`
      SELECT id, nome, id_funcionario, is_admin, ativo,
             CASE WHEN senha_hash IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_senha
      FROM usuarios
      WHERE role = 'user' OR role = 'admin'
      ORDER BY id_funcionario::int
      LIMIT 10
    `);
    internos.rows.forEach(u => {
      console.log(`  [${u.id_funcionario}] ${u.nome} - Admin: ${u.is_admin ? 'SIM' : 'NÃO'} - Ativo: ${u.ativo ? 'SIM' : 'NÃO'} - Senha: ${u.tem_senha}`);
    });
    console.log('');

    // Amostra de clientes
    console.log('Amostra de CLIENTES:');
    const clientes = await pool.query(`
      SELECT id, nome, id_funcionario, ativo,
             CASE WHEN senha_hash IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_senha
      FROM usuarios
      WHERE role = 'client'
      ORDER BY nome
      LIMIT 5
    `);
    clientes.rows.forEach(u => {
      console.log(`  [${u.id_funcionario}] ${u.nome} - Ativo: ${u.ativo ? 'SIM' : 'NÃO'} - Senha: ${u.tem_senha}`);
    });

    console.log('\n=== Login Info ===');
    console.log('Para fazer login, use:');
    console.log('  ID Funcionário: número do id_funcionario (ex: 100 para DANIEL ANDERS)');
    console.log('  Senha: a senha original usada quando o usuário foi criado');
    console.log('');
    console.log('NOTA: As senhas estão armazenadas como hash bcrypt.');
    console.log('Os usuários devem usar suas senhas originais (não o hash).');

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verifyUsuarios();
