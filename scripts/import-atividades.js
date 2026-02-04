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

function parseDecimal(decimalString) {
  if (!decimalString || decimalString.trim() === '') return null;
  const num = parseFloat(decimalString);
  return isNaN(num) ? null : num;
}

async function importAtividades() {
  const results = [];

  console.log('Lendo arquivo CSV de atividades...');

  fs.createReadStream('registros_atividades.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Total de registros no CSV: ${results.length}`);

      try {
        // Limpar tabela antes de importar (opcional)
        await pool.query('DELETE FROM registros_atividades');
        console.log('Tabela limpa. Iniciando importação...');

        let imported = 0;
        let errors = 0;

        for (const row of results) {
          try {
            const query = `
              INSERT INTO registros_atividades (
                id, numero_opd, atividade, responsavel,
                previsao_inicio, data_pedido, data_inicio, data_termino,
                cadastro_opd, status, status_alt, tempo_medio,
                observacoes, created, updated
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `;

            const values = [
              parseInt(row['ID']) || null,
              row['NÃºmero da OPD'] || row['Número da OPD'] || null,
              row['Atividade'] || null,
              row['ResponsÃ¡vel'] || row['Responsável'] || null,
              parseDate(row['PREVISÃO DE INÃCIO']) || parseDate(row['PREVISÃO DE INÍCIO']),
              parseDate(row['Data do pedido']),
              parseDate(row['Data de inÃ­cio']) || parseDate(row['Data de início']),
              parseDate(row['Data de tÃ©rmino']) || parseDate(row['Data de término']),
              row['cadastro_opd'] || null,
              row['Status'] || null,
              row['Status'] || null, // status_alt - segunda coluna Status no CSV
              parseDecimal(row['Tempo mÃ©dio']) || parseDecimal(row['Tempo médio']),
              row['ObservaÃ§Ãµes'] || row['Observações'] || null,
              parseDate(row['Created']),
              parseDate(row['Updated'])
            ];

            await pool.query(query, values);
            imported++;

            if (imported % 50 === 0) {
              console.log(`Importado: ${imported}/${results.length} atividades`);
            }
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

importAtividades();
