const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixStatusValues() {
  try {
    console.log('Corrigindo valores de status inválidos...\n');

    // Primeiro, verificar quantos registros precisam ser corrigidos
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM registros_atividades
      WHERE status IS NULL OR status IN ('1', '2', '3', '4')
    `);
    console.log('Registros com status inválido:', checkResult.rows[0].count);

    // Converter status NULL para 'A REALIZAR'
    const nullResult = await pool.query(`
      UPDATE registros_atividades
      SET status = 'A REALIZAR', updated = NOW()
      WHERE status IS NULL
    `);
    console.log('Convertidos NULL → A REALIZAR:', nullResult.rowCount);

    // Converter status numéricos para texto
    // Baseado no padrão comum: 1 = EM ANDAMENTO, 3 = CONCLUÍDA
    const status1Result = await pool.query(`
      UPDATE registros_atividades
      SET status = 'EM ANDAMENTO', updated = NOW()
      WHERE status = '1'
    `);
    console.log('Convertidos "1" → EM ANDAMENTO:', status1Result.rowCount);

    const status2Result = await pool.query(`
      UPDATE registros_atividades
      SET status = 'A REALIZAR', updated = NOW()
      WHERE status = '2'
    `);
    console.log('Convertidos "2" → A REALIZAR:', status2Result.rowCount);

    const status3Result = await pool.query(`
      UPDATE registros_atividades
      SET status = 'CONCLUÍDA', updated = NOW()
      WHERE status = '3'
    `);
    console.log('Convertidos "3" → CONCLUÍDA:', status3Result.rowCount);

    const status4Result = await pool.query(`
      UPDATE registros_atividades
      SET status = 'CONCLUÍDA', updated = NOW()
      WHERE status = '4'
    `);
    console.log('Convertidos "4" → CONCLUÍDA:', status4Result.rowCount);

    // Verificar resultado final
    console.log('\nVerificando resultado para OPD 3212025:');
    const verifyResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM registros_atividades
      WHERE numero_opd = '3212025'
      GROUP BY status
      ORDER BY status
    `);

    console.log('Nova distribuição:');
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    console.log('\n✅ Status corrigidos com sucesso!');

  } catch (error) {
    console.error('Erro ao corrigir status:', error);
  } finally {
    await pool.end();
  }
}

fixStatusValues();
