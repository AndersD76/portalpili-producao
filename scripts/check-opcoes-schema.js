const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
  await client.connect();
  
  // Get table columns
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'crm_precos_opcoes' 
    ORDER BY ordinal_position
  `);
  console.log('=== Columns ===');
  cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} | nullable=${r.is_nullable} | default=${r.column_default}`));

  // Check constraints
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'crm_precos_opcoes'::regclass
  `);
  console.log('\n=== Constraints ===');
  constraints.rows.forEach(r => console.log(`  ${r.conname} (${r.contype}): ${r.def}`));

  // Check triggers
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'crm_precos_opcoes'
  `);
  console.log('\n=== Triggers ===');
  triggers.rows.forEach(r => console.log(`  ${r.trigger_name}: ${r.event_manipulation} -> ${r.action_statement}`));

  // Check if fn_precos_auditoria exists
  const fnExists = await client.query(`
    SELECT proname, prosrc 
    FROM pg_proc 
    WHERE proname = 'fn_precos_auditoria'
  `);
  console.log('\n=== fn_precos_auditoria ===');
  if (fnExists.rows.length > 0) {
    console.log(fnExists.rows[0].prosrc);
  } else {
    console.log('Function NOT FOUND');
  }

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
