const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function main() {
  // Check constraints
  const constraints = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'crm_precos_opcoes'::regclass
  `);
  console.log('=== CONSTRAINTS ===');
  constraints.rows.forEach(r => console.log(r.conname, ':', r.pg_get_constraintdef));

  // Check existing codigos
  const codigos = await pool.query(`SELECT id, codigo, nome FROM crm_precos_opcoes ORDER BY id`);
  console.log('\n=== EXISTING CODIGOS ===');
  codigos.rows.forEach(r => console.log(`id=${r.id} codigo="${r.codigo}" nome="${r.nome}"`));
  
  // Check numeric MAX
  const maxNum = await pool.query(`SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 as prox FROM crm_precos_opcoes WHERE codigo ~ '^[0-9]+$'`);
  console.log('\n=== NEXT AUTO CODE ===', maxNum.rows[0].prox);
  
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
