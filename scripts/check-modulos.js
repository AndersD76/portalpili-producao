require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkModulos() {
  const client = await pool.connect();
  try {
    console.log('\n=== Verificando tabela modulos ===\n');

    // Check if modulos table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'modulos'
      )
    `);
    console.log('Tabela modulos existe:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Get all modules
      const modulos = await client.query(`SELECT * FROM modulos ORDER BY ordem`);
      console.log('\nMódulos encontrados:', modulos.rows.length);
      modulos.rows.forEach(m => {
        console.log(`  - ${m.codigo}: ${m.nome} (ativo: ${m.ativo})`);
      });
    }

    console.log('\n=== Verificando tabela permissoes_modulos ===\n');

    // Check if permissoes_modulos table exists
    const permTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'permissoes_modulos'
      )
    `);
    console.log('Tabela permissoes_modulos existe:', permTableCheck.rows[0].exists);

    if (permTableCheck.rows[0].exists) {
      // Get permissions for user 100
      const perms = await client.query(`
        SELECT * FROM permissoes_modulos WHERE usuario_id = 100
      `);
      console.log('\nPermissões do usuário 100:', perms.rows.length);
      perms.rows.forEach(p => {
        console.log(`  - modulo_id: ${p.modulo_id}, visualizar: ${p.pode_visualizar}, criar: ${p.pode_criar}`);
      });
    }

    console.log('\n=== Verificando usuário 100 ===\n');

    const user = await client.query(`
      SELECT u.*, pa.nome as perfil_nome, pa.permissoes_padrao
      FROM usuarios u
      LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
      WHERE u.id = 100
    `);

    if (user.rows.length > 0) {
      const u = user.rows[0];
      console.log('Usuário encontrado:');
      console.log('  - ID:', u.id);
      console.log('  - Nome:', u.nome);
      console.log('  - is_admin:', u.is_admin);
      console.log('  - perfil_id:', u.perfil_id);
      console.log('  - perfil_nome:', u.perfil_nome);
      console.log('  - permissoes_padrao:', JSON.stringify(u.permissoes_padrao, null, 2));
    } else {
      console.log('Usuário 100 NÃO encontrado!');
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkModulos();
