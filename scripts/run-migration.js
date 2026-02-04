// Script para adicionar colunas ao banco de dados
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Iniciando migração...');

    // Adicionar colunas que faltam
    const alterStatements = [
      "ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS anexos JSONB",
      "ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS turno_trabalho VARCHAR(50)",
      "ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS numero_opd VARCHAR(100)",
      "ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS quantidade_itens INTEGER",
      "ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS data_contencao TIMESTAMP"
    ];

    for (const stmt of alterStatements) {
      try {
        await client.query(stmt);
        console.log('OK:', stmt.substring(0, 60) + '...');
      } catch (err) {
        // Ignora erros se a coluna já existe
        if (err.code === '42701') {
          console.log('Já existe:', stmt.substring(40, 80));
        } else {
          console.error('Erro:', err.message);
        }
      }
    }

    // Verificar colunas
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'nao_conformidades'
      ORDER BY ordinal_position
    `);

    console.log('\nColunas da tabela nao_conformidades:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\nMigração concluída com sucesso!');

  } catch (error) {
    console.error('Erro na migração:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
