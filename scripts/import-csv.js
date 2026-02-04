require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function parseJSON(jsonString) {
  if (!jsonString || jsonString.trim() === '') return null;
  try {
    // Substituir aspas simples por duplas para JSON válido
    const validJson = jsonString.replace(/'/g, '"');
    return JSON.parse(validJson);
  } catch (error) {
    console.warn('Erro ao parsear JSON:', jsonString);
    return null;
  }
}

async function importCSV() {
  const results = [];

  console.log('Lendo arquivo CSV...');

  fs.createReadStream('cadastro_opd.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Total de registros no CSV: ${results.length}`);

      try {
        // Limpar tabela antes de importar (opcional)
        await pool.query('DELETE FROM opds');
        console.log('Tabela limpa. Iniciando importação...');

        let imported = 0;
        let errors = 0;

        for (const row of results) {
          try {
            const query = `
              INSERT INTO opds (
                id, opd, numero, data_pedido, previsao_inicio,
                previsao_termino, inicio_producao, tipo_opd,
                responsavel_opd, atividades_opd, anexo_pedido,
                registros_atividade, created, updated
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            `;

            const values = [
              parseInt(row['ID']) || null,
              row['OPD'] || null,
              row['NÃMERO'] || null,
              parseDate(row['DATA DO PEDIDO']),
              parseDate(row['PREVISÃO DE INÃCIO']),
              parseDate(row['PREVISÃO DE TÃRMINO']),
              parseDate(row['INÃCIO DA PRODUÃÃO']),
              row['tipo_opd'] || null,
              row['responsavel_opd'] || null,
              row['atividades_opd'] || null,
              parseJSON(row['Anexar pedido']),
              row['registros_atividade'] || null,
              parseDate(row['Created']),
              parseDate(row['Updated'])
            ];

            await pool.query(query, values);
            imported++;
            console.log(`Importado: OPD ${row['NÃMERO']} (${imported}/${results.length})`);
          } catch (error) {
            errors++;
            console.error(`Erro ao importar registro ID ${row['ID']}:`, error.message);
          }
        }

        console.log(`\n✅ Importação concluída!`);
        console.log(`   - Registros importados: ${imported}`);
        console.log(`   - Erros: ${errors}`);

      } catch (error) {
        console.error('Erro durante a importação:', error);
      } finally {
        await pool.end();
      }
    })
    .on('error', (error) => {
      console.error('Erro ao ler o arquivo CSV:', error);
    });
}

importCSV();
