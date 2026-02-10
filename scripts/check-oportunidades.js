const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Total de oportunidades
    const total = await pool.query('SELECT COUNT(*) as total FROM crm_oportunidades');
    console.log('=== TOTAL OPORTUNIDADES ===');
    console.log('Total:', total.rows[0].total);

    // Por status
    const porStatus = await pool.query(`
      SELECT status, COUNT(*) as total
      FROM crm_oportunidades
      GROUP BY status
    `);
    console.log('\n=== POR STATUS ===');
    porStatus.rows.forEach(r => console.log(`${r.status}: ${r.total}`));

    // Por estágio (apenas ABERTAS)
    const porEstagio = await pool.query(`
      SELECT estagio, COUNT(*) as quantidade, SUM(valor_estimado) as valor_total
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
    `);
    console.log('\n=== PIPELINE (status=ABERTA) ===');
    porEstagio.rows.forEach(r => {
      const valor = Number(r.valor_total) || 0;
      console.log(`${r.estagio}: ${r.quantidade} - R$ ${valor.toLocaleString('pt-BR')}`);
    });

    // Propostas SEM oportunidade
    const semOp = await pool.query(`
      SELECT COUNT(*) as total
      FROM crm_propostas
      WHERE oportunidade_id IS NULL
    `);
    console.log('\n=== PROPOSTAS SEM OPORTUNIDADE ===');
    console.log('Total:', semOp.rows[0].total);

    // Propostas COM oportunidade mas oportunidade FECHADA
    const opFechada = await pool.query(`
      SELECT COUNT(*) as total
      FROM crm_propostas p
      JOIN crm_oportunidades o ON p.oportunidade_id = o.id
      WHERE o.status != 'ABERTA'
    `);
    console.log('\n=== PROPOSTAS COM OPORTUNIDADE FECHADA ===');
    console.log('Total:', opFechada.rows[0].total);

    await pool.end();
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
}
check();
