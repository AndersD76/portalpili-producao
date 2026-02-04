const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando migrações do banco de dados...\n');

    // Migration 1: Update Schema
    console.log('📋 Executando update-schema.sql...');
    const updateSchemaSql = fs.readFileSync(
      path.join(__dirname, 'update-schema.sql'),
      'utf8'
    );
    await client.query(updateSchemaSql);
    console.log('✅ update-schema.sql executado com sucesso!\n');

    // Migration 2: Add data_entrega
    console.log('📋 Executando add-data-entrega.sql...');
    const addDataEntregaSql = fs.readFileSync(
      path.join(__dirname, 'add-data-entrega.sql'),
      'utf8'
    );
    await client.query(addDataEntregaSql);
    console.log('✅ add-data-entrega.sql executado com sucesso!\n');

    // Migration 3: Add authentication and audit
    console.log('📋 Executando add-authentication-audit.sql...');
    const addAuthSql = fs.readFileSync(
      path.join(__dirname, 'add-authentication-audit.sql'),
      'utf8'
    );
    await client.query(addAuthSql);
    console.log('✅ add-authentication-audit.sql executado com sucesso!\n');

    console.log('🎉 Todas as migrações foram executadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
