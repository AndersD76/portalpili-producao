const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    // 1. Check is_admin for all active users
    console.log('=== 1. ACTIVE USERS - is_admin CHECK ===');
    const users = await client.query(`
      SELECT id, nome, is_admin, perfil_id, pg_typeof(is_admin) as tipo_is_admin
      FROM usuarios
      WHERE ativo = true
      ORDER BY id
    `);
    console.table(users.rows);
    console.log(`Total active users: ${users.rows.length}\n`);

    // 2. Check unique constraints on crm_precos_opcoes
    console.log('=== 2. UNIQUE CONSTRAINTS ON crm_precos_opcoes ===');
    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'crm_precos_opcoes'::regclass
      ORDER BY conname
    `);
    if (constraints.rows.length === 0) {
      console.log('No constraints found on crm_precos_opcoes');
    } else {
      console.table(constraints.rows);
    }
    console.log('');

    // Also check indexes
    console.log('=== 2b. INDEXES ON crm_precos_opcoes ===');
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'crm_precos_opcoes'
      ORDER BY indexname
    `);
    if (indexes.rows.length === 0) {
      console.log('No indexes found');
    } else {
      indexes.rows.forEach(r => {
        console.log(`  ${r.indexname}: ${r.indexdef}`);
      });
    }
    console.log('');

    // 3. Check all existing records in crm_precos_opcoes
    console.log('=== 3. ALL RECORDS IN crm_precos_opcoes ===');
    const records = await client.query(`
      SELECT id, codigo, nome, created_at, updated_at
      FROM crm_precos_opcoes
      ORDER BY id
    `);
    if (records.rows.length === 0) {
      console.log('No records found in crm_precos_opcoes');
    } else {
      console.table(records.rows);
    }
    console.log(`Total records: ${records.rows.length}\n`);

    // 4. Check for orphaned/deleted records causing conflicts
    console.log('=== 4. ORPHANED/DELETED RECORDS CHECK ===');
    
    // Check if table has soft-delete column
    const columns = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'crm_precos_opcoes'
      ORDER BY ordinal_position
    `);
    console.log('Columns in crm_precos_opcoes:');
    console.table(columns.rows);

    // Check for duplicate codigos
    const dupes = await client.query(`
      SELECT codigo, COUNT(*) as count
      FROM crm_precos_opcoes
      GROUP BY codigo
      HAVING COUNT(*) > 1
      ORDER BY codigo
    `);
    if (dupes.rows.length === 0) {
      console.log('\nNo duplicate codigos found.');
    } else {
      console.log('\nDuplicate codigos:');
      console.table(dupes.rows);
    }

    // Check for duplicate nomes
    const dupeNomes = await client.query(`
      SELECT nome, COUNT(*) as count
      FROM crm_precos_opcoes
      GROUP BY nome
      HAVING COUNT(*) > 1
      ORDER BY nome
    `);
    if (dupeNomes.rows.length === 0) {
      console.log('No duplicate nomes found.');
    } else {
      console.log('Duplicate nomes:');
      console.table(dupeNomes.rows);
    }
    console.log('');

    // 5. Check exact constraint names starting with "crm_pr"
    console.log('=== 5. ALL CONSTRAINTS STARTING WITH "crm_pr" ===');
    const crmConstraints = await client.query(`
      SELECT c.conname, c.contype, 
             r.relname as table_name,
             pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_class r ON c.conrelid = r.oid
      WHERE c.conname LIKE 'crm_pr%'
      ORDER BY c.conname
    `);
    if (crmConstraints.rows.length === 0) {
      console.log('No constraints found starting with "crm_pr"');
    } else {
      console.table(crmConstraints.rows);
    }

    console.log('\n=== DONE ===');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
