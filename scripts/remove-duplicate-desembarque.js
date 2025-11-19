require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function removeDuplicateDesembarque() {
  const client = await pool.connect();

  try {
    console.log('Iniciando remoção de duplicatas de "DESEMBARQUE E PRÉ INSTALAÇÃO"...\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query('SELECT numero FROM opds ORDER BY numero');
    const opds = opdsResult.rows;

    console.log(`Total de OPDs encontradas: ${opds.length}\n`);

    let totalRemoved = 0;

    for (const opd of opds) {
      // Buscar todas as ocorrências de "DESEMBARQUE E PRÉ INSTALAÇÃO"
      const duplicatesResult = await client.query(
        `SELECT id FROM registros_atividades
         WHERE numero_opd = $1 AND atividade = 'DESEMBARQUE E PRÉ INSTALAÇÃO'
         ORDER BY id ASC`,
        [opd.numero]
      );

      const duplicates = duplicatesResult.rows;

      if (duplicates.length > 1) {
        console.log(`\n========================================`);
        console.log(`OPD ${opd.numero}: Encontradas ${duplicates.length} ocorrências`);

        await client.query('BEGIN');

        try {
          // Remover a primeira ocorrência (penúltima na lista)
          const idToRemove = duplicates[0].id;

          await client.query(
            'DELETE FROM registros_atividades WHERE id = $1',
            [idToRemove]
          );

          console.log(`  ✓ Removida atividade duplicada (ID: ${idToRemove})`);
          console.log(`  ✓ Mantida atividade (ID: ${duplicates[1].id})`);

          totalRemoved++;

          await client.query('COMMIT');

        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`  ✗ Erro ao processar OPD ${opd.numero}:`, error.message);
        }
      } else if (duplicates.length === 1) {
        console.log(`OPD ${opd.numero}: OK (1 ocorrência)`);
      } else {
        console.log(`OPD ${opd.numero}: Nenhuma atividade encontrada`);
      }
    }

    console.log('\n========================================');
    console.log(`Total de duplicatas removidas: ${totalRemoved}`);
    console.log('Processamento concluído!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

removeDuplicateDesembarque();
