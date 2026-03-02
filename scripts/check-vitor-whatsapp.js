const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

(async () => {
  try {
    // Check Vitor Muller's phone numbers
    const vendedores = await pool.query(
      "SELECT id, nome, whatsapp, telefone FROM crm_vendedores WHERE nome ILIKE '%vitor%' OR nome ILIKE '%muller%'"
    );
    console.log('=== VENDEDOR VITOR MULLER ===');
    console.log(JSON.stringify(vendedores.rows, null, 2));

    // Check recent status checks
    const checks = await pool.query(
      `SELECT sc.id, sc.token, sc.created_at, sc.mensagem_whatsapp_id,
              v.nome as vendedor_nome, v.whatsapp, v.telefone
       FROM crm_status_checks sc
       JOIN crm_vendedores v ON sc.vendedor_id = v.id
       ORDER BY sc.created_at DESC LIMIT 5`
    );
    console.log('\n=== ULTIMOS STATUS CHECKS ===');
    console.log(JSON.stringify(checks.rows, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
})();
