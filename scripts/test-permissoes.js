// Script para testar permissões
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  const client = await pool.connect();
  try {
    // Buscar um vendedor (perfil_id = 3)
    const vendedor = await client.query('SELECT id, nome, perfil_id FROM usuarios WHERE perfil_id = 3 AND ativo = true LIMIT 1');
    if (vendedor.rows.length > 0) {
      console.log('Vendedor encontrado:', vendedor.rows[0].nome, '(ID:', vendedor.rows[0].id + ')');

      const user = await client.query(`
        SELECT u.id, u.is_admin, u.perfil_id, pa.permissoes_padrao
        FROM usuarios u
        LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
        WHERE u.id = $1
      `, [vendedor.rows[0].id]);

      const permissoesPadrao = user.rows[0].permissoes_padrao || {};
      console.log('\nPermissões do perfil Vendedor:');
      Object.entries(permissoesPadrao).forEach(([modulo, perms]) => {
        console.log('  ' + modulo + ': visualizar=' + perms.visualizar);
      });
    }

    // Buscar um operador (perfil_id = 4)
    const operador = await client.query('SELECT id, nome, perfil_id FROM usuarios WHERE perfil_id = 4 AND ativo = true LIMIT 1');
    if (operador.rows.length > 0) {
      console.log('\nOperador encontrado:', operador.rows[0].nome, '(ID:', operador.rows[0].id + ')');

      const user = await client.query(`
        SELECT u.id, u.is_admin, u.perfil_id, pa.permissoes_padrao
        FROM usuarios u
        LEFT JOIN perfis_acesso pa ON pa.id = u.perfil_id
        WHERE u.id = $1
      `, [operador.rows[0].id]);

      const permissoesPadrao = user.rows[0].permissoes_padrao || {};
      console.log('\nPermissões do perfil Operador Produção:');
      Object.entries(permissoesPadrao).forEach(([modulo, perms]) => {
        console.log('  ' + modulo + ': visualizar=' + perms.visualizar);
      });
    }

    // Verificar se a lógica está correta para um vendedor acessando comercial/qualidade
    console.log('\n========================================');
    console.log('VERIFICAÇÃO DE LÓGICA:');
    console.log('========================================');
    console.log('- Vendedor deve ver COMERCIAL: SIM');
    console.log('- Vendedor deve ver QUALIDADE: NÃO');
    console.log('- Operador deve ver PRODUCAO: SIM');
    console.log('- Operador deve ver COMERCIAL: NÃO');

  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    await pool.end();
  }
}

test();
