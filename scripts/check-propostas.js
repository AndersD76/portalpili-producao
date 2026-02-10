const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Resumo por situação
    const situacao = await pool.query(`
      SELECT situacao, COUNT(*) as total, SUM(valor_total) as valor_total
      FROM crm_propostas
      GROUP BY situacao
      ORDER BY total DESC
    `);
    console.log('=== PROPOSTAS POR SITUAÇÃO ===');
    let totalGeral = 0;
    let countGeral = 0;
    situacao.rows.forEach(r => {
      const valor = Number(r.valor_total) || 0;
      totalGeral += valor;
      countGeral += Number(r.total);
      console.log(`${r.situacao}: ${r.total} propostas - R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    });
    console.log(`\nTOTAL: ${countGeral} propostas - R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

    // Últimas 10 propostas
    const ultimas = await pool.query(`
      SELECT p.numero_proposta, p.situacao, p.produto, p.valor_total, p.data_proposta,
             c.razao_social as cliente, v.nome as vendedor
      FROM crm_propostas p
      LEFT JOIN crm_clientes c ON p.cliente_id = c.id
      LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);
    console.log('\n=== ÚLTIMAS 10 PROPOSTAS ===');
    ultimas.rows.forEach(r => {
      const valor = Number(r.valor_total) || 0;
      console.log(`#${r.numero_proposta} | ${r.situacao} | ${r.produto} | R$ ${valor.toLocaleString('pt-BR')} | ${r.cliente || 'N/A'}`);
    });

    // Propostas abertas (não FECHADA, não PERDIDA, não CANCELADA)
    const abertas = await pool.query(`
      SELECT COUNT(*) as total, SUM(valor_total) as valor
      FROM crm_propostas
      WHERE situacao NOT IN ('FECHADA', 'PERDIDA', 'CANCELADA', 'EXPIRADA', 'REJEITADA')
    `);
    console.log('\n=== PROPOSTAS ABERTAS (Em negociação) ===');
    console.log(`Total: ${abertas.rows[0].total} - R$ ${Number(abertas.rows[0].valor || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

    // Verificar pipeline
    const pipeline = await pool.query(`
      SELECT
        o.estagio,
        COUNT(p.id) as total_propostas,
        SUM(p.valor_total) as valor_total
      FROM crm_oportunidades o
      LEFT JOIN crm_propostas p ON p.oportunidade_id = o.id
      WHERE o.status = 'ABERTA'
      GROUP BY o.estagio
      ORDER BY
        CASE o.estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'NEGOCIACAO' THEN 4
          WHEN 'FECHAMENTO' THEN 5
        END
    `);
    console.log('\n=== PIPELINE DE VENDAS (Oportunidades) ===');
    pipeline.rows.forEach(r => {
      const valor = Number(r.valor_total) || 0;
      console.log(`${r.estagio}: ${r.total_propostas} oportunidades - R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    });

    await pool.end();
  } catch (e) {
    console.error('Erro:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}
check();
