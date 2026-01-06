require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixInstalacaoOrder() {
  const client = await pool.connect();

  try {
    console.log('Corrigindo ordem das atividades de INSTALAÇÃO...');
    console.log('Essas atividades devem estar APÓS EXPEDIÇÃO\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query(`
      SELECT DISTINCT numero_opd FROM registros_atividades
    `);

    let totalUpdated = 0;

    for (const opdRow of opdsResult.rows) {
      const numeroOpd = opdRow.numero_opd;

      // Buscar a data da EXPEDIÇÃO para esta OPD
      const expedicaoResult = await client.query(`
        SELECT previsao_inicio FROM registros_atividades
        WHERE numero_opd = $1
        AND UPPER(atividade) LIKE '%EXPEDI%'
        LIMIT 1
      `, [numeroOpd]);

      if (expedicaoResult.rows.length === 0) {
        continue; // OPD não tem expedição, pular
      }

      const dataExpedicao = expedicaoResult.rows[0].previsao_inicio;

      if (!dataExpedicao) {
        continue; // Data não definida, pular
      }

      // Atualizar PREPARAÇÃO (INSTALAÇÃO) - 1 dia após expedição
      const prepResult = await client.query(`
        UPDATE registros_atividades
        SET previsao_inicio = $1::date + INTERVAL '1 day'
        WHERE numero_opd = $2
        AND UPPER(atividade) = 'PREPARAÇÃO'
        AND UPPER(responsavel) = 'INSTALAÇÃO'
        AND previsao_inicio < $1::date + INTERVAL '1 day'
        RETURNING id
      `, [dataExpedicao, numeroOpd]);

      // Atualizar DESEMBARQUE E PRÉ-INSTALAÇÃO - 2 dias após expedição
      const desembarqueResult = await client.query(`
        UPDATE registros_atividades
        SET previsao_inicio = $1::date + INTERVAL '2 days'
        WHERE numero_opd = $2
        AND UPPER(atividade) LIKE '%DESEMBARQUE%'
        AND previsao_inicio < $1::date + INTERVAL '2 days'
        RETURNING id
      `, [dataExpedicao, numeroOpd]);

      // Atualizar ENTREGA - 3 dias após expedição
      const entregaResult = await client.query(`
        UPDATE registros_atividades
        SET previsao_inicio = $1::date + INTERVAL '3 days'
        WHERE numero_opd = $2
        AND UPPER(atividade) = 'ENTREGA'
        AND UPPER(responsavel) = 'INSTALAÇÃO'
        AND previsao_inicio < $1::date + INTERVAL '3 days'
        RETURNING id
      `, [dataExpedicao, numeroOpd]);

      const updated = prepResult.rowCount + desembarqueResult.rowCount + entregaResult.rowCount;

      if (updated > 0) {
        console.log(`OPD ${numeroOpd}: ${updated} atividades atualizadas (Expedição: ${new Date(dataExpedicao).toLocaleDateString('pt-BR')})`);
        totalUpdated += updated;
      }
    }

    console.log(`\n✅ Concluído! Total de ${totalUpdated} atividades atualizadas.`);

  } catch (error) {
    console.error('Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixInstalacaoOrder();
