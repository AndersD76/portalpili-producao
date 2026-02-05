// Script para verificar dados do Pipeline diretamente
// Executa via: node scripts/check-pipeline.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkPipeline() {
  const client = await pool.connect();

  try {
    console.log('========================================');
    console.log('DIAGNÓSTICO DO PIPELINE');
    console.log('========================================\n');

    // 1. Verificar total de oportunidades
    const totalResult = await client.query('SELECT COUNT(*) as total FROM crm_oportunidades');
    console.log('Total de oportunidades na tabela:', totalResult.rows[0].total);

    // 2. Verificar status distintos
    const statusResult = await client.query('SELECT status, COUNT(*) as total FROM crm_oportunidades GROUP BY status ORDER BY total DESC');
    console.log('\nOportunidades por STATUS:');
    statusResult.rows.forEach(row => {
      console.log(`  ${row.status || 'NULL'}: ${row.total}`);
    });

    // 3. Verificar estágios distintos
    const estagioResult = await client.query('SELECT estagio, COUNT(*) as total FROM crm_oportunidades GROUP BY estagio ORDER BY total DESC');
    console.log('\nOportunidades por ESTÁGIO:');
    estagioResult.rows.forEach(row => {
      console.log(`  ${row.estagio || 'NULL'}: ${row.total}`);
    });

    // 4. Query exata do pipeline (como na API)
    console.log('\n========================================');
    console.log('QUERY DO PIPELINE (como na API):');
    console.log('========================================\n');
    const pipelineResult = await client.query(`
      SELECT
        estagio,
        COUNT(*) as quantidade,
        SUM(valor_estimado) as valor_total
      FROM crm_oportunidades
      WHERE status = 'ABERTA'
      GROUP BY estagio
    `);

    console.log('Resultado do Pipeline:');
    if (pipelineResult.rows.length === 0) {
      console.log('  NENHUM RESULTADO! Verifique se o status está como "ABERTA" (maiúsculo)');
    } else {
      pipelineResult.rows.forEach(row => {
        const valor = Number(row.valor_total) || 0;
        console.log(`  ${row.estagio}: ${row.quantidade} oportunidades - R$ ${valor.toLocaleString('pt-BR')}`);
      });
    }

    // 5. Verificar se o problema é case-sensitivity
    console.log('\n========================================');
    console.log('VERIFICANDO CASE-SENSITIVITY:');
    console.log('========================================\n');

    const caseCheck = await client.query(`
      SELECT DISTINCT status, LENGTH(status) as len
      FROM crm_oportunidades
      WHERE LOWER(status) = 'aberta'
    `);
    console.log('Valores de status que correspondem a "aberta" (case-insensitive):');
    caseCheck.rows.forEach(row => {
      console.log(`  "${row.status}" (length: ${row.len})`);
    });

    // 6. Verificar uma amostra de registros
    console.log('\n========================================');
    console.log('AMOSTRA DE REGISTROS:');
    console.log('========================================\n');

    const sampleResult = await client.query(`
      SELECT id, titulo, estagio, status, valor_estimado
      FROM crm_oportunidades
      LIMIT 5
    `);
    sampleResult.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Status: "${row.status}" | Estágio: ${row.estagio} | Valor: R$ ${Number(row.valor_estimado || 0).toLocaleString('pt-BR')}`);
    });

    console.log('\n========================================');
    console.log('DIAGNÓSTICO COMPLETO');
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPipeline();
