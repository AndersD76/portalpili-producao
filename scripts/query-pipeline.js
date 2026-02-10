const { Pool } = require('pg');
const p = new Pool({connectionString:'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'});

async function run() {
  // Check oportunidades pipeline
  const r1 = await p.query('SELECT estagio, COUNT(*) as qtd, COALESCE(SUM(valor_estimado),0) as valor FROM crm_oportunidades GROUP BY estagio ORDER BY qtd DESC');
  console.log('=== crm_oportunidades ===');
  console.log(JSON.stringify(r1.rows, null, 2));

  // Check propostas_comerciais
  const r2 = await p.query('SELECT COUNT(*) as total FROM propostas_comerciais');
  console.log('\n=== propostas_comerciais total ===', r2.rows[0].total);

  // Check propostas_comerciais columns
  const r3 = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='propostas_comerciais' ORDER BY ordinal_position");
  console.log('\n=== propostas_comerciais columns ===');
  console.log(r3.rows.map(r => r.column_name).join(', '));

  await p.end();
}
run().catch(e => { console.error(e); p.end(); });
