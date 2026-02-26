require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    // Verificar se crm_precos_config existe
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'crm_precos_config'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('Tabela crm_precos_config nao existe. Criando...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS crm_precos_config (
          id SERIAL PRIMARY KEY,
          chave VARCHAR(100) UNIQUE NOT NULL,
          valor TEXT NOT NULL,
          tipo VARCHAR(20) DEFAULT 'STRING',
          descricao TEXT,
          grupo VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      console.log('Tabela criada.');
    }

    // Inserir ou atualizar whatsapp_analista
    const result = await pool.query(`
      INSERT INTO crm_precos_config (chave, valor, tipo, descricao, grupo)
      VALUES ('whatsapp_analista', '5554991644867', 'STRING', 'Numero WhatsApp do analista comercial (comercial1@pili.ind.br)', 'COMERCIAL')
      ON CONFLICT (chave) DO UPDATE SET valor = '5554991644867', updated_at = NOW()
      RETURNING *
    `);

    console.log('WhatsApp analista configurado:', result.rows[0]);
  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

main();
