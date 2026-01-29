const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const result = await pool.query(
    `SELECT s.codigo as setor, s.nome as setor_nome, p.codigo, p.requer_imagem, p.opcoes
     FROM cq_setores s JOIN cq_perguntas p ON p.setor_id = s.id
     ORDER BY s.ordem, p.ordem`
  );

  let currentSetor = '';
  result.rows.forEach(r => {
    if (r.setor !== currentSetor) {
      console.log('');
      console.log('=== ' + r.setor + ' - ' + r.setor_nome + ' ===');
      currentSetor = r.setor;
    }
    const img = r.requer_imagem ? '[IMG]' : '     ';
    console.log(img + ' ' + r.codigo + ' | Opções: ' + r.opcoes.join(', '));
  });

  await pool.end();
}

check().catch(console.error);
