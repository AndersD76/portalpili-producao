const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const client = await pool.connect();
  try {
    // Check opcoes column type
    const colType = await client.query(
      "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'cq_perguntas' AND column_name = 'opcoes'"
    );
    console.log('Tipo da coluna opcoes:', colType.rows[0]);

    // Check questions with their opcoes
    const perguntas = await client.query(
      "SELECT p.codigo, p.opcoes, pg_typeof(p.opcoes) as tipo_real, s.codigo as setor FROM cq_perguntas p JOIN cq_setores s ON s.id = p.setor_id ORDER BY s.codigo, p.codigo LIMIT 30"
    );
    console.log('\nPerguntas com opcoes:');
    perguntas.rows.forEach(r => {
      const opcoes = r.opcoes;
      const tipo = typeof opcoes;
      console.log('  ' + r.setor + ' | ' + r.codigo + ' | tipo_js:', tipo, '| tipo_pg:', r.tipo_real, '| valor:', JSON.stringify(opcoes));
    });
  } finally {
    client.release();
    await pool.end();
  }
}
check();
