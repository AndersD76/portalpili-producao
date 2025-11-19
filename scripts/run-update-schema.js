require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runUpdateSchema() {
  const client = await pool.connect();

  try {
    console.log('🔄 Conectando ao banco de dados...');

    // Ler o arquivo SQL
    const sqlFile = path.join(__dirname, 'update-schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📄 Executando script de atualização do schema...');

    // Executar o SQL
    await client.query(sql);

    console.log('✅ Schema atualizado com sucesso!');
    console.log('\n📊 Verificando estrutura...');

    // Verificar tabelas criadas
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📋 Tabelas no banco:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verificar etapas configuradas
    const etapas = await client.query(`
      SELECT nome_etapa, ordem, responsavel_padrao, requer_formulario, tipo_formulario
      FROM configuracao_etapas
      ORDER BY ordem;
    `);

    console.log('\n🔢 Etapas configuradas:');
    etapas.rows.forEach(etapa => {
      const form = etapa.requer_formulario ? `[${etapa.tipo_formulario}]` : '';
      console.log(`  ${etapa.ordem}. ${etapa.nome_etapa} - ${etapa.responsavel_padrao} ${form}`);
    });

    console.log('\n✨ Atualização concluída!');

  } catch (error) {
    console.error('❌ Erro ao atualizar schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runUpdateSchema();
