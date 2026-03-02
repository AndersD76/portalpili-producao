const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require' });
  await client.connect();
  
  // Check all records, especially recent ones
  const result = await client.query(`
    SELECT id, codigo, nome, descricao, preco, preco_tipo, produto, tamanhos_aplicaveis, ativo, created_at
    FROM crm_precos_opcoes
    ORDER BY id DESC
    LIMIT 20
  `);
  console.log('=== Recent opcoes records ===');
  result.rows.forEach(r => console.log(JSON.stringify(r)));

  // Check for duplicates by codigo
  const dupes = await client.query(`
    SELECT codigo, COUNT(*) as cnt
    FROM crm_precos_opcoes
    GROUP BY codigo
    HAVING COUNT(*) > 1
  `);
  console.log('\n=== Duplicate codigos ===');
  dupes.rows.forEach(r => console.log(JSON.stringify(r)));

  // Check sequence value
  const seq = await client.query(`SELECT last_value FROM crm_precos_opcoes_id_seq`);
  console.log('\n=== Sequence last_value ===', seq.rows[0].last_value);

  await client.end();
}
main().catch(e => { console.error(e); process.exit(1); });
