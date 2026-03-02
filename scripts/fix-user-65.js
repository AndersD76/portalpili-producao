const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash('24065835', 10);

    // Tabelas com FK para usuarios.id
    const fkTables = [
      'permissoes_modulos.usuario_id',
      'usuarios_perfis.usuario_id',
      'log_atividades.usuario_id',
      'crm_vendedores.usuario_id',
      'crm_precos_historico.usuario_id',
      'crm_propostas.desconto_aprovado_por',
      'crm_propostas.liberacao_usuario_id',
      'crm_propostas.created_by',
      'crm_propostas.updated_by',
      'crm_propostas_historico.alterado_por',
      'crm_propostas_emails.enviado_por',
      'crm_propostas_comerciais.vendedor_id',
      'crm_propostas_comerciais.created_by',
      'crm_propostas_comerciais.updated_by',
    ];

    // Dropar todas as FK constraints
    const constraints = await client.query(`
      SELECT tc.constraint_name, tc.table_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE ccu.table_name = 'usuarios' AND ccu.column_name = 'id' AND tc.constraint_type = 'FOREIGN KEY'
    `);

    for (const c of constraints.rows) {
      await client.query(`ALTER TABLE ${c.table_name} DROP CONSTRAINT ${c.constraint_name}`);
      console.log(`Dropped: ${c.table_name}.${c.constraint_name}`);
    }

    // Atualizar FKs de 307 -> 65
    for (const fk of fkTables) {
      const [table, col] = fk.split('.');
      const r = await client.query(`UPDATE ${table} SET ${col} = 65 WHERE ${col} = 307`);
      if (r.rowCount > 0) console.log(`  ${table}.${col}: ${r.rowCount}`);
    }

    // Atualizar usuario
    await client.query(
      'UPDATE usuarios SET id = 65, senha_hash = $1, password = $1, email = $2 WHERE id = 307',
      [hash, 'vitor.muller']
    );
    console.log('VITOR MULLER: ID=65, login=vitor.muller');

    // Recriar FK constraints
    for (const c of constraints.rows) {
      const fkDef = fkTables.find(f => f.startsWith(c.table_name + '.'));
      if (fkDef) {
        const col = fkDef.split('.')[1];
        await client.query(`ALTER TABLE ${c.table_name} ADD CONSTRAINT ${c.constraint_name} FOREIGN KEY (${col}) REFERENCES usuarios(id)`);
        console.log(`Restored: ${c.table_name}.${c.constraint_name}`);
      }
    }

    await client.query('COMMIT');

    const result = await client.query('SELECT id, nome, email FROM usuarios WHERE id = 65');
    console.log('\nResultado:', JSON.stringify(result.rows[0]));
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
