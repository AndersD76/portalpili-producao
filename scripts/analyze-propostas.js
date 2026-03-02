const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

(async () => {
  try {
    // 1. Totais por status/estagio
    console.log('=== 1. DISTRIBUIÇÃO POR ESTÁGIO ===');
    const estagios = await pool.query(`
      SELECT estagio, status, COUNT(*) as qtd,
        ROUND(AVG(CAST(valor_estimado AS NUMERIC)), 0) as ticket_medio,
        ROUND(AVG(probabilidade), 0) as prob_media,
        MIN(created_at)::date as mais_antiga,
        MAX(created_at)::date as mais_recente
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY qtd DESC
    `);
    console.table(estagios.rows);

    // 2. Win rate por vendedor
    console.log('\n=== 2. WIN RATE POR VENDEDOR ===');
    const winRate = await pool.query(`
      SELECT v.nome,
        COUNT(*) FILTER (WHERE o.estagio = 'FECHADA') as ganhas,
        COUNT(*) FILTER (WHERE o.estagio = 'PERDIDA') as perdidas,
        COUNT(*) as total,
        CASE WHEN COUNT(*) FILTER (WHERE o.estagio IN ('FECHADA','PERDIDA')) > 0
          THEN ROUND(100.0 * COUNT(*) FILTER (WHERE o.estagio = 'FECHADA') /
            COUNT(*) FILTER (WHERE o.estagio IN ('FECHADA','PERDIDA')), 1)
          ELSE 0 END as win_rate_pct
      FROM crm_oportunidades o
      JOIN crm_vendedores v ON o.vendedor_id = v.id
      GROUP BY v.nome
      ORDER BY total DESC
      LIMIT 15
    `);
    console.table(winRate.rows);

    // 3. Dados de atividades por oportunidade
    console.log('\n=== 3. ATIVIDADES (amostra) ===');
    const atividades = await pool.query(`
      SELECT
        COUNT(DISTINCT oportunidade_id) as opps_com_atividade,
        COUNT(*) as total_atividades,
        ROUND(AVG(cnt), 1) as media_por_opp
      FROM (
        SELECT oportunidade_id, COUNT(*) as cnt
        FROM crm_atividades
        WHERE oportunidade_id IS NOT NULL
        GROUP BY oportunidade_id
      ) sub
    `);
    console.table(atividades.rows);

    // 4. Interacoes
    console.log('\n=== 4. INTERAÇÕES ===');
    const interacoes = await pool.query(`
      SELECT tipo, COUNT(*) as qtd
      FROM crm_interacoes
      GROUP BY tipo
      ORDER BY qtd DESC
      LIMIT 15
    `);
    console.table(interacoes.rows);

    // 5. Dados dos clientes
    console.log('\n=== 5. CLIENTES - TEMPERATURA & SCORE ===');
    const clientes = await pool.query(`
      SELECT
        temperatura, COUNT(*) as qtd,
        ROUND(AVG(score_potencial), 0) as score_medio
      FROM crm_clientes
      GROUP BY temperatura
      ORDER BY qtd DESC
    `);
    console.table(clientes.rows);

    // 6. Campos com dados vs nulos
    console.log('\n=== 6. COBERTURA DE DADOS (oportunidades) ===');
    const cobertura = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(temperatura) as com_temperatura,
        COUNT(concorrente) as com_concorrente,
        COUNT(data_previsao_fechamento) as com_previsao,
        COUNT(fonte) as com_fonte,
        COUNT(valor_estimado) FILTER (WHERE CAST(valor_estimado AS NUMERIC) > 0) as com_valor,
        COUNT(vendedor_id) as com_vendedor
      FROM crm_oportunidades
    `);
    console.table(cobertura.rows);

    // 7. Tempo médio por estágio (deals fechados)
    console.log('\n=== 7. CICLO DE VENDAS (deals fechados) ===');
    const ciclo = await pool.query(`
      SELECT
        COUNT(*) as total_fechadas,
        ROUND(AVG(EXTRACT(DAY FROM data_fechamento - data_abertura)), 0) as dias_medio_fechamento,
        ROUND(AVG(CAST(valor_final AS NUMERIC)), 0) as valor_final_medio,
        ROUND(AVG(CAST(valor_estimado AS NUMERIC)), 0) as valor_estimado_medio
      FROM crm_oportunidades
      WHERE estagio = 'FECHADA' AND data_fechamento IS NOT NULL AND data_abertura IS NOT NULL
    `);
    console.table(ciclo.rows);

    // 8. Propostas comerciais
    console.log('\n=== 8. PROPOSTAS COMERCIAIS (tabela separada) ===');
    const propostas = await pool.query(`
      SELECT
        situacao, COUNT(*) as qtd,
        ROUND(AVG(CAST(valor_total AS NUMERIC)), 0) as valor_medio
      FROM propostas_comerciais
      GROUP BY situacao
      ORDER BY qtd DESC
    `);
    console.table(propostas.rows);

    // 9. Segmentos dos clientes
    console.log('\n=== 9. SEGMENTOS DOS CLIENTES ===');
    const segmentos = await pool.query(`
      SELECT segmento, porte, COUNT(*) as qtd
      FROM crm_clientes
      WHERE segmento IS NOT NULL OR porte IS NOT NULL
      GROUP BY segmento, porte
      ORDER BY qtd DESC
      LIMIT 15
    `);
    console.table(segmentos.rows);

    // 10. Produtos mais vendidos
    console.log('\n=== 10. PRODUTOS NAS OPORTUNIDADES ===');
    const produtos = await pool.query(`
      SELECT produto, COUNT(*) as qtd,
        ROUND(AVG(CAST(valor_estimado AS NUMERIC)), 0) as ticket_medio
      FROM crm_oportunidades
      WHERE produto IS NOT NULL
      GROUP BY produto
      ORDER BY qtd DESC
    `);
    console.table(produtos.rows);

  } catch(e) {
    console.error('Erro:', e.message);
  } finally {
    await pool.end();
  }
})();
