/**
 * Relatório Final - Status do Módulo Comercial
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

async function gerarRelatorio() {
  try {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║        RELATÓRIO DO MÓDULO COMERCIAL - PORTAL PILI           ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // 1. VENDEDORES
    const vendedores = await pool.query('SELECT COUNT(*) as total FROM crm_vendedores WHERE ativo = true');
    console.log(`📊 VENDEDORES: ${vendedores.rows[0].total} ativos`);

    // 2. CLIENTES
    const clientes = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ATIVO') as ativos,
        COUNT(*) FILTER (WHERE status = 'PROSPECTO') as prospectos,
        COUNT(*) FILTER (WHERE temperatura = 'QUENTE') as quentes
      FROM crm_clientes
    `);
    const c = clientes.rows[0];
    console.log(`\n👥 CLIENTES:`);
    console.log(`   Total: ${c.total}`);
    console.log(`   Ativos: ${c.ativos}`);
    console.log(`   Prospectos: ${c.prospectos}`);
    console.log(`   Quentes: ${c.quentes}`);

    // 3. PROPOSTAS
    const propostas = await pool.query(`
      SELECT
        situacao,
        COUNT(*) as quantidade,
        SUM(valor_total) as valor
      FROM crm_propostas
      GROUP BY situacao
      ORDER BY quantidade DESC
    `);
    console.log(`\n📄 PROPOSTAS:`);
    let totalPropostas = 0;
    let totalValorPropostas = 0;
    propostas.rows.forEach(r => {
      const val = Number(r.valor) || 0;
      totalPropostas += Number(r.quantidade);
      totalValorPropostas += val;
      console.log(`   ${r.situacao}: ${r.quantidade} - ${formatCurrency(val)}`);
    });
    console.log(`   ────────────────────────────────────`);
    console.log(`   TOTAL: ${totalPropostas} propostas - ${formatCurrency(totalValorPropostas)}`);

    // 4. PIPELINE (OPORTUNIDADES ABERTAS)
    const pipeline = await pool.query(`
      SELECT estagio, COUNT(*) as quantidade, SUM(valor_estimado) as valor
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'NEGOCIACAO' THEN 4
          WHEN 'FECHAMENTO' THEN 5
        END
    `);
    console.log(`\n📈 PIPELINE DE VENDAS (Oportunidades Abertas):`);
    let totalPipeline = 0;
    let totalValorPipeline = 0;
    ['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA', 'NEGOCIACAO', 'FECHAMENTO'].forEach(est => {
      const row = pipeline.rows.find(r => r.estagio === est);
      const qtd = row ? Number(row.quantidade) : 0;
      const val = row ? Number(row.valor) : 0;
      totalPipeline += qtd;
      totalValorPipeline += val;
      const barra = '█'.repeat(Math.min(qtd / 10, 30));
      console.log(`   ${est.padEnd(12)}: ${String(qtd).padStart(3)} ${barra} ${formatCurrency(val)}`);
    });
    console.log(`   ────────────────────────────────────`);
    console.log(`   TOTAL: ${totalPipeline} oportunidades - ${formatCurrency(totalValorPipeline)}`);

    // 5. PREÇOS CONFIGURADOS
    const precos = await pool.query(`SELECT COUNT(*) as total FROM crm_precos_base WHERE ativo = true`);
    const opcoes = await pool.query(`SELECT COUNT(*) as total FROM crm_precos_opcoes WHERE ativo = true`);
    const descontos = await pool.query(`SELECT COUNT(*) as total FROM crm_precos_descontos WHERE ativo = true`);
    console.log(`\n💰 TABELA DE PREÇOS:`);
    console.log(`   Preços Base: ${precos.rows[0].total} produtos`);
    console.log(`   Opcionais: ${opcoes.rows[0].total} itens`);
    console.log(`   Faixas de Desconto: ${descontos.rows[0].total}`);

    // 6. ATIVIDADES
    const atividades = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDENTE') as pendentes,
        COUNT(*) FILTER (WHERE status = 'PENDENTE' AND data_agendada < NOW()) as atrasadas,
        COUNT(*) FILTER (WHERE status = 'PENDENTE' AND data_agendada BETWEEN NOW() AND NOW() + INTERVAL '7 days') as proxima_semana,
        COUNT(*) FILTER (WHERE status = 'CONCLUIDA') as concluidas
      FROM crm_atividades
    `);
    const a = atividades.rows[0];
    console.log(`\n✅ ATIVIDADES:`);
    console.log(`   Pendentes: ${a.pendentes}`);
    console.log(`   Atrasadas: ${a.atrasadas}`);
    console.log(`   Próxima Semana: ${a.proxima_semana}`);
    console.log(`   Concluídas: ${a.concluidas}`);

    // 7. TOP 5 CLIENTES POR VALOR
    const topClientes = await pool.query(`
      SELECT c.razao_social, SUM(p.valor_total) as valor, COUNT(p.id) as propostas
      FROM crm_clientes c
      JOIN crm_propostas p ON p.cliente_id = c.id
      WHERE p.situacao NOT IN ('CANCELADA', 'PERDIDA')
      GROUP BY c.id, c.razao_social
      ORDER BY valor DESC
      LIMIT 5
    `);
    console.log(`\n🏆 TOP 5 CLIENTES (por valor em propostas):`);
    topClientes.rows.forEach((r, i) => {
      console.log(`   ${i+1}. ${(r.razao_social || 'N/A').substring(0, 35).padEnd(35)} - ${formatCurrency(r.valor)} (${r.propostas} prop.)`);
    });

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    FIM DO RELATÓRIO                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await pool.end();
  }
}

gerarRelatorio();
