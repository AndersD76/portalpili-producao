// Script para excluir OPDs com números problemáticos (barras)
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function deleteOPDs() {
  const numerosParaExcluir = ['325/2025', '382/2025'];

  console.log('Buscando OPDs para excluir...');

  try {
    for (const numero of numerosParaExcluir) {
      // Buscar OPD
      const result = await pool.query('SELECT id, numero FROM opds WHERE numero = $1', [numero]);

      if (result.rows.length === 0) {
        console.log(`OPD ${numero} não encontrada`);
        continue;
      }

      const opdId = result.rows[0].id;
      console.log(`Encontrada OPD ${numero} (ID: ${opdId})`);

      // Buscar atividades relacionadas
      const atividadesResult = await pool.query(
        'SELECT id FROM registros_atividades WHERE numero_opd = $1',
        [numero]
      );
      const atividadeIds = atividadesResult.rows.map(r => r.id);
      console.log(`  - ${atividadeIds.length} atividades relacionadas`);

      // Deletar formulários preenchidos
      if (atividadeIds.length > 0) {
        try {
          const formResult = await pool.query(
            'DELETE FROM formularios_preenchidos WHERE atividade_id = ANY($1)',
            [atividadeIds]
          );
          console.log(`  - ${formResult.rowCount} formulários excluídos`);
        } catch (e) {
          console.log('  - Nenhum formulário para excluir');
        }
      }

      // Deletar atividades
      const atividadesDelResult = await pool.query(
        'DELETE FROM registros_atividades WHERE numero_opd = $1',
        [numero]
      );
      console.log(`  - ${atividadesDelResult.rowCount} atividades excluídas`);

      // Deletar OPD
      await pool.query('DELETE FROM opds WHERE id = $1', [opdId]);
      console.log(`✅ OPD ${numero} excluída com sucesso!`);
    }

    console.log('\nProcesso concluído!');
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

deleteOPDs();
