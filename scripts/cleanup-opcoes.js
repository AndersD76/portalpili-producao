const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
  await client.connect();
  
  // Delete the orphan record
  const del = await client.query(`DELETE FROM crm_precos_opcoes WHERE codigo = 'INCLINAÇÃO' RETURNING id, codigo, nome`);
  console.log('Deleted:', del.rows);

  // Also check for any other INCLINACAO variants
  const check = await client.query(`SELECT id, codigo, nome FROM crm_precos_opcoes WHERE codigo LIKE 'INCLIN%'`);
  console.log('Remaining INCLIN* records:', check.rows);
  
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
