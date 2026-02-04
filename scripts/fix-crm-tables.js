/**
 * Script para verificar e corrigir estrutura das tabelas CRM
 */
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_pCqSLW9j2hKQ@ep-crimson-heart-ahcg1r28-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();

  try {
    console.log('Verificando estrutura das tabelas CRM...\n');

    // Verificar colunas existentes
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'crm_clientes'
      ORDER BY ordinal_position
    `);

    console.log('Colunas atuais em crm_clientes:');
    console.log(result.rows.map(r => r.column_name).join(', '));
    console.log('');

    // Adicionar colunas faltantes
    const colunasNecessarias = [
      { nome: 'cidade', tipo: 'VARCHAR(100)' },
      { nome: 'pais', tipo: "VARCHAR(100) DEFAULT 'Brasil'" },
      { nome: 'regiao', tipo: 'VARCHAR(50)' },
      { nome: 'endereco', tipo: 'TEXT' },
      { nome: 'segmento', tipo: 'VARCHAR(100)' },
    ];

    for (const coluna of colunasNecessarias) {
      try {
        await client.query(`ALTER TABLE crm_clientes ADD COLUMN IF NOT EXISTS ${coluna.nome} ${coluna.tipo}`);
        console.log(`✓ Coluna ${coluna.nome} verificada/adicionada`);
      } catch (err) {
        console.log(`! Coluna ${coluna.nome}: ${err.message}`);
      }
    }

    console.log('\n✓ Estrutura atualizada');

  } catch (error) {
    console.error('ERRO:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
