require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function removeOldTasks() {
  const client = await pool.connect();

  try {
    console.log('Iniciando remoção de atividades antigas...\n');

    // Lista de atividades antigas que devem ser removidas
    const oldTasks = [
      'RECEBIMENTO DE MATÉRIA PRIMA',
      'DOBRA',
      'USINAGEM',
      'SOLDAGEM',
      'JATEAMENTO',
      'MONTAGEM MECÂNICA',
      'MONTAGEM HIDRÁULICA',
      'MONTAGEM ELÉTRICA',
      'TESTES',
      'EMBALAGEM'
    ];

    // Também remover CORTE e PINTURA que não sejam subtarefas (parent_id IS NULL)
    const tasksToRemoveWithoutParent = [
      'CORTE',
      'PINTURA'
    ];

    console.log('Atividades que serão removidas:');
    oldTasks.forEach(task => console.log(`  - ${task}`));
    console.log('\nAtividades que serão removidas SE NÃO forem subtarefas:');
    tasksToRemoveWithoutParent.forEach(task => console.log(`  - ${task}`));
    console.log('\n========================================\n');

    // Buscar todas as OPDs
    const opdsResult = await client.query('SELECT numero FROM opds ORDER BY numero');
    const opds = opdsResult.rows;

    console.log(`Total de OPDs encontradas: ${opds.length}\n`);

    let totalRemoved = 0;

    for (const opd of opds) {
      console.log(`\nProcessando OPD: ${opd.numero}`);

      await client.query('BEGIN');

      try {
        // Remover atividades da lista oldTasks
        const result1 = await client.query(
          'DELETE FROM registros_atividades WHERE numero_opd = $1 AND atividade = ANY($2::text[]) RETURNING atividade',
          [opd.numero, oldTasks]
        );

        // Remover CORTE e PINTURA que não são subtarefas
        const result2 = await client.query(
          'DELETE FROM registros_atividades WHERE numero_opd = $1 AND atividade = ANY($2::text[]) AND parent_id IS NULL RETURNING atividade',
          [opd.numero, tasksToRemoveWithoutParent]
        );

        const removedCount = result1.rowCount + result2.rowCount;
        totalRemoved += removedCount;

        if (removedCount > 0) {
          console.log(`  ✓ Removidas ${removedCount} atividades antigas`);

          // Mostrar quais foram removidas
          const allRemoved = [...result1.rows, ...result2.rows];
          allRemoved.forEach(row => {
            console.log(`    - ${row.atividade}`);
          });
        } else {
          console.log(`  - Nenhuma atividade antiga encontrada`);
        }

        await client.query('COMMIT');

      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Erro ao processar OPD ${opd.numero}:`, error.message);
      }
    }

    console.log('\n========================================');
    console.log(`Total de atividades removidas: ${totalRemoved}`);
    console.log('Processamento concluído!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

removeOldTasks();
