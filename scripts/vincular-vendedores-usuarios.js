// Script para vincular vendedores do CRM aos usuarios da tabela usuarios
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function vincularVendedores() {
  const client = await pool.connect();
  try {
    console.log('=== Vinculando Vendedores aos Usuarios ===\n');

    // Buscar vendedores sem vinculo (distintos por nome)
    const vendedores = await client.query(`
      SELECT DISTINCT ON (UPPER(nome)) id, nome
      FROM crm_vendedores
      WHERE usuario_id IS NULL AND ativo = true
      ORDER BY UPPER(nome), id
    `);

    console.log('Vendedores sem vinculo:', vendedores.rows.length);

    let vinculados = 0;
    for (const v of vendedores.rows) {
      // Buscar usuario com nome parecido
      const nomeUpper = v.nome.toUpperCase();
      const usuario = await client.query(`
        SELECT id, nome
        FROM usuarios
        WHERE UPPER(nome) LIKE '%' || $1 || '%'
        LIMIT 1
      `, [nomeUpper]);

      if (usuario.rows.length > 0) {
        // Vincular
        await client.query('UPDATE crm_vendedores SET usuario_id = $1 WHERE id = $2', [usuario.rows[0].id, v.id]);
        // Marcar usuario como vendedor
        await client.query('UPDATE usuarios SET is_vendedor = true WHERE id = $1', [usuario.rows[0].id]);
        console.log('  Vinculado:', v.nome, '=>', usuario.rows[0].nome, '(Usuario ID:', usuario.rows[0].id, ')');
        vinculados++;
      } else {
        console.log('  Nao encontrado usuario para:', v.nome);
      }
    }

    console.log('\nTotal vinculados:', vinculados);

    // Resumo final
    const resumo = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(usuario_id) as vinculados
      FROM crm_vendedores
      WHERE ativo = true
    `);
    console.log('\n=== Resumo ===');
    console.log('  Total vendedores ativos:', resumo.rows[0].total);
    console.log('  Vinculados a usuarios:', resumo.rows[0].vinculados);

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

vincularVendedores();
