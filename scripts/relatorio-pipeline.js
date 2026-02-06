/**
 * Relatório do Pipeline Atualizado
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
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║           PIPELINE DE VENDAS ATUALIZADO - PORTAL PILI            ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Pipeline completo (todos os status)
    const pipelineCompleto = await pool.query(`
      SELECT
        estagio,
        status,
        COUNT(*) as quantidade,
        SUM(valor_estimado) as valor
      FROM crm_oportunidades
      GROUP BY estagio, status
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
          WHEN 'PERDIDA' THEN 7
          WHEN 'SUSPENSO' THEN 8
          WHEN 'SUBSTITUIDO' THEN 9
          WHEN 'TESTE' THEN 10
        END,
        status
    `);

    console.log('📊 PIPELINE COMPLETO (todos os status):');
    console.log('─'.repeat(68));

    let totalGeral = 0;
    let valorGeral = 0;

    pipelineCompleto.rows.forEach(r => {
      const qtd = Number(r.quantidade);
      const val = Number(r.valor) || 0;
      totalGeral += qtd;
      valorGeral += val;
      const barra = '█'.repeat(Math.min(Math.ceil(qtd / 10), 20));
      console.log(`${r.estagio.padEnd(15)} ${r.status.padEnd(10)} ${String(qtd).padStart(4)} ${barra.padEnd(20)} ${formatCurrency(val)}`);
    });

    console.log('─'.repeat(68));
    console.log(`${'TOTAL'.padEnd(26)} ${String(totalGeral).padStart(4)}${' '.repeat(21)} ${formatCurrency(valorGeral)}`);

    // Pipeline ativo (para dashboard - apenas ABERTA)
    console.log('\n\n📈 PIPELINE ATIVO (status=ABERTA) - Para Dashboard:');
    console.log('─'.repeat(68));

    const pipelineAtivo = await pool.query(`
      SELECT
        estagio,
        COUNT(*) as quantidade,
        SUM(valor_estimado) as valor
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
      ORDER BY
        CASE estagio
          WHEN 'PROSPECCAO' THEN 1
          WHEN 'QUALIFICACAO' THEN 2
          WHEN 'PROPOSTA' THEN 3
          WHEN 'EM_ANALISE' THEN 4
          WHEN 'EM_NEGOCIACAO' THEN 5
          WHEN 'FECHADA' THEN 6
        END
    `);

    const estagiosAtivos = ['PROSPECCAO', 'QUALIFICACAO', 'PROPOSTA', 'EM_ANALISE', 'EM_NEGOCIACAO', 'FECHADA'];
    let totalAtivo = 0;
    let valorAtivo = 0;

    estagiosAtivos.forEach(est => {
      const row = pipelineAtivo.rows.find(r => r.estagio === est);
      const qtd = row ? Number(row.quantidade) : 0;
      const val = row ? Number(row.valor) : 0;
      totalAtivo += qtd;
      valorAtivo += val;
      const barra = '█'.repeat(Math.min(Math.ceil(qtd / 10), 20));
      console.log(`${est.padEnd(15)} ${String(qtd).padStart(4)} ${barra.padEnd(20)} ${formatCurrency(val)}`);
    });

    console.log('─'.repeat(68));
    console.log(`${'TOTAL ATIVO'.padEnd(15)} ${String(totalAtivo).padStart(4)}${' '.repeat(21)} ${formatCurrency(valorAtivo)}`);

    // Métricas de conversão
    console.log('\n\n📉 MÉTRICAS DE CONVERSÃO:');
    console.log('─'.repeat(68));

    const fechadas = await pool.query(`SELECT COUNT(*) as total, SUM(valor_estimado) as valor FROM crm_oportunidades WHERE estagio = 'FECHADA' AND status = 'GANHA'`);
    const perdidas = await pool.query(`SELECT COUNT(*) as total, SUM(valor_estimado) as valor FROM crm_oportunidades WHERE estagio = 'PERDIDA'`);
    const suspensas = await pool.query(`SELECT COUNT(*) as total, SUM(valor_estimado) as valor FROM crm_oportunidades WHERE estagio = 'SUSPENSO'`);

    const fec = fechadas.rows[0];
    const per = perdidas.rows[0];
    const sus = suspensas.rows[0];

    const totalFinalizado = Number(fec.total) + Number(per.total);
    const taxaConversao = totalFinalizado > 0 ? ((Number(fec.total) / totalFinalizado) * 100).toFixed(1) : 0;

    console.log(`Fechadas (Ganhas):  ${fec.total} oportunidades - ${formatCurrency(fec.valor)}`);
    console.log(`Perdidas:           ${per.total} oportunidades - ${formatCurrency(per.valor)}`);
    console.log(`Suspensas:          ${sus.total} oportunidades - ${formatCurrency(sus.valor)}`);
    console.log(`Taxa de Conversão:  ${taxaConversao}%`);

    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                        FIM DO RELATÓRIO                          ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝');

  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await pool.end();
  }
}

gerarRelatorio();
