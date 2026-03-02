const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
  await client.connect();
  
  // List all current opcoes
  const all = await client.query(`SELECT id, codigo, nome FROM crm_precos_opcoes ORDER BY id`);
  console.log('Current records:');
  if (all.rows.length === 0) {
    console.log('  (none)');
  } else {
    all.rows.forEach(r => console.log(`  id=${r.id} codigo=${r.codigo} nome=${r.nome}`));
  }
  
  // Renumber them sequentially: 1, 2, 3...
  let seq = 1;
  for (const row of all.rows) {
    await client.query(`UPDATE crm_precos_opcoes SET codigo = $1 WHERE id = $2`, [String(seq), row.id]);
    console.log(`  Updated id=${row.id}: ${row.codigo} -> ${seq}`);
    seq++;
  }
  
  // Reset sequence only if there are rows
  if (all.rows.length > 0) {
    await client.query(`SELECT setval('crm_precos_opcoes_id_seq', (SELECT MAX(id) FROM crm_precos_opcoes))`);
    console.log('Sequence reset to MAX(id).');
  } else {
    console.log('No rows found, sequence left as-is.');
  }
  
  console.log('\nDone. All codes renumbered sequentially.');
  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
