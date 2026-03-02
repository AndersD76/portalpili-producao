const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    // 7. Ciclo de vendas - tipo das colunas
    console.log('=== 7. COLUNAS data_fechamento e data_abertura ===');
    const tipos = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'crm_oportunidades'
      AND column_name IN ('data_fechamento','data_abertura','data_previsao_fechamento','dias_no_estagio','temperatura','concorrente','fonte','produto')
    `);
    console.table(tipos.rows);

    // 7b. Deals fechados
    console.log('\n=== 7b. DEALS FECHADOS (amostra) ===');
    const fechados = await pool.query(`
      SELECT id, titulo, valor_estimado, valor_final, data_abertura, data_fechamento, vendedor_id
      FROM crm_oportunidades
      WHERE estagio = 'FECHADA'
      LIMIT 5
    `);
    console.table(fechados.rows);

    // 8. Propostas comerciais
    console.log('\n=== 8. PROPOSTAS COMERCIAIS ===');
    const propostas = await pool.query(`
      SELECT situacao, COUNT(*) as qtd,
        ROUND(AVG(CAST(COALESCE(valor_total, '0') AS NUMERIC)), 0) as valor_medio
      FROM propostas_comerciais
      GROUP BY situacao
      ORDER BY qtd DESC
    `);
    console.table(propostas.rows);

    // 9. Dados da proposta - colunas disponíveis
    console.log('\n=== 9. COLUNAS DE propostas_comerciais ===');
    const colsPropostas = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'propostas_comerciais'
      ORDER BY ordinal_position
    `);
    console.table(colsPropostas.rows);

    // 10. Fontes das oportunidades
    console.log('\n=== 10. FONTES ===');
    const fontes = await pool.query(`
      SELECT fonte, COUNT(*) as qtd,
        COUNT(*) FILTER (WHERE estagio = 'FECHADA') as ganhas,
        COUNT(*) FILTER (WHERE estagio = 'PERDIDA') as perdidas
      FROM crm_oportunidades
      GROUP BY fonte ORDER BY qtd DESC
    `);
    console.table(fontes.rows);

    // 11. Temperatura nas oportunidades
    console.log('\n=== 11. TEMPERATURA NAS OPORTUNIDADES ===');
    const temp = await pool.query(`
      SELECT temperatura, COUNT(*) as qtd,
        COUNT(*) FILTER (WHERE estagio = 'FECHADA') as ganhas,
        COUNT(*) FILTER (WHERE estagio = 'PERDIDA') as perdidas
      FROM crm_oportunidades
      GROUP BY temperatura ORDER BY qtd DESC
    `);
    console.table(temp.rows);

    // 12. Concorrentes
    console.log('\n=== 12. CONCORRENTES ===');
    const conc = await pool.query(`
      SELECT concorrente, COUNT(*) as qtd
      FROM crm_oportunidades
      WHERE concorrente IS NOT NULL AND concorrente != ''
      GROUP BY concorrente ORDER BY qtd DESC LIMIT 10
    `);
    console.table(conc.rows);

    // 13. Produtos + win rate
    console.log('\n=== 13. PRODUTOS + WIN RATE ===');
    const prod = await pool.query(`
      SELECT produto, COUNT(*) as total,
        COUNT(*) FILTER (WHERE estagio = 'FECHADA') as ganhas,
        COUNT(*) FILTER (WHERE estagio = 'PERDIDA') as perdidas,
        ROUND(AVG(CAST(valor_estimado AS NUMERIC)), 0) as ticket_medio
      FROM crm_oportunidades
      WHERE produto IS NOT NULL
      GROUP BY produto ORDER BY total DESC
    `);
    console.table(prod.rows);

    // 14. Probabilidades atuais vs resultado
    console.log('\n=== 14. PROB ATUAL vs RESULTADO ===');
    const probVsResult = await pool.query(`
      SELECT
        CASE
          WHEN probabilidade < 30 THEN '0-29%'
          WHEN probabilidade < 50 THEN '30-49%'
          WHEN probabilidade < 70 THEN '50-69%'
          WHEN probabilidade < 90 THEN '70-89%'
          ELSE '90-100%'
        END as faixa_prob,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estagio = 'FECHADA') as ganhas,
        COUNT(*) FILTER (WHERE estagio = 'PERDIDA') as perdidas,
        COUNT(*) FILTER (WHERE status = 'ABERTA') as abertas
      FROM crm_oportunidades
      GROUP BY faixa_prob
      ORDER BY faixa_prob
    `);
    console.table(probVsResult.rows);

  } catch(e) {
    console.error('Erro:', e.message);
  } finally {
    await pool.end();
  }
})();
