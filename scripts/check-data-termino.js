require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDataTermino() {
  try {
    console.log('Verificando atividades concluídas...\\n');

    const result = await pool.query(`
      SELECT
        id,
        descricao,
        status,
        data_inicio,
        data_termino,
        finalizado_por_nome
      FROM registros_atividades
      WHERE status = 'CONCLUÍDA'
      ORDER BY id
      LIMIT 10
    `);

    console.log(`Total de atividades concluídas: ${result.rowCount}\\n`);

    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Descrição: ${row.descricao}`);
        console.log(`Status: ${row.status}`);
        console.log(`Data início: ${row.data_inicio}`);
        console.log(`Data término: ${row.data_termino}`);
        console.log(`Finalizado por: ${row.finalizado_por_nome}`);
        console.log('---');
      });
    } else {
      console.log('Nenhuma atividade concluída encontrada.');
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

checkDataTermino();
