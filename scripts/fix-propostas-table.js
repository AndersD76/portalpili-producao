/**
 * Script para corrigir estrutura da tabela crm_propostas
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
    console.log('Verificando estrutura da tabela crm_propostas...\n');

    // Verificar colunas existentes
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'crm_propostas'
      ORDER BY ordinal_position
    `);

    console.log('Colunas atuais em crm_propostas:');
    console.log(result.rows.map(r => r.column_name).join(', '));
    console.log('');

    // Adicionar colunas faltantes para importação do CSV
    const colunasNecessarias = [
      { nome: 'chance_negocio', tipo: 'VARCHAR(50)' },
      { nome: 'numero_proposta_original', tipo: 'INTEGER' },
      { nome: 'data_proposta', tipo: 'DATE' },
      { nome: 'cultura', tipo: 'VARCHAR(100)' },
      { nome: 'aplicacao', tipo: 'VARCHAR(100)' },
      { nome: 'prazo_entrega', tipo: 'VARCHAR(100)' },
      { nome: 'prazo_pagamento', tipo: 'VARCHAR(100)' },
      { nome: 'observacoes_importacao', tipo: 'TEXT' },
    ];

    for (const coluna of colunasNecessarias) {
      try {
        await client.query(`ALTER TABLE crm_propostas ADD COLUMN IF NOT EXISTS ${coluna.nome} ${coluna.tipo}`);
        console.log(`✓ Coluna ${coluna.nome} verificada/adicionada`);
      } catch (err) {
        console.log(`! Coluna ${coluna.nome}: ${err.message}`);
      }
    }

    console.log('\n✓ Estrutura de crm_propostas atualizada');

  } catch (error) {
    console.error('ERRO:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
