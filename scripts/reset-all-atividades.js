require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  min: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function resetAllAtividades() {
  try {
    console.log('🔄 Resetando TODAS as atividades para "A REALIZAR"...\n');

    // Verificar quantas atividades existem
    const countResult = await pool.query('SELECT COUNT(*) as total FROM registros_atividades');
    const total = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Total de atividades no banco: ${total}\n`);

    // Resetar todas as atividades
    const result = await pool.query(`
      UPDATE registros_atividades
      SET 
        status = 'A REALIZAR',
        data_inicio = NULL,
        data_termino = NULL,
        iniciado_por_id = NULL,
        iniciado_por_nome = NULL,
        iniciado_por_id_funcionario = NULL,
        finalizado_por_id = NULL,
        finalizado_por_nome = NULL,
        finalizado_por_id_funcionario = NULL,
        justificativa_reversao = NULL,
        updated = NOW()
      WHERE status != 'A REALIZAR' OR 
            data_inicio IS NOT NULL OR 
            data_termino IS NOT NULL
      RETURNING id
    `);

    console.log(`✅ ${result.rowCount} atividades foram resetadas para "A REALIZAR"\n`);
    console.log(`✓ Todas as datas e rastreamentos foram limpos`);
    console.log(`✓ Status definido como "A REALIZAR"`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

resetAllAtividades();
