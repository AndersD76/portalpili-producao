const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addQualityColumns() {
  const client = await pool.connect();

  try {
    console.log('Adicionando colunas nas tabelas de qualidade...\n');

    // Adicionar colunas na tabela nao_conformidades
    console.log('=== TABELA nao_conformidades ===');

    const ncColumns = [
      { name: 'data_emissao', type: 'TIMESTAMP' },
      { name: 'responsavel_emissao', type: 'VARCHAR(255)' },
      { name: 'unidade_fabricacao', type: 'VARCHAR(50)' },
      { name: 'processo_origem', type: 'VARCHAR(100)' },
      { name: 'tarefa_origem', type: 'VARCHAR(100)' },
      { name: 'codigo_peca', type: 'VARCHAR(255)' },
      { name: 'evidencia_objetiva', type: 'TEXT' },
      { name: 'acao_imediata', type: 'TEXT' },
      { name: 'responsaveis_acoes', type: 'VARCHAR(255)' },
      { name: 'prazo_acoes', type: 'TIMESTAMP' },
      { name: 'responsavel_liberacao', type: 'VARCHAR(255)' },
      { name: 'anexos', type: 'JSONB' },
      { name: 'turno_trabalho', type: 'VARCHAR(50)' },
      { name: 'numero_opd', type: 'VARCHAR(100)' },
      { name: 'quantidade_itens', type: 'INTEGER' }
    ];

    for (const col of ncColumns) {
      try {
        await client.query(`
          ALTER TABLE nao_conformidades
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`✓ Coluna ${col.name} adicionada/verificada`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`→ Coluna ${col.name} já existe`);
        } else {
          console.log(`✗ Erro ao adicionar ${col.name}: ${err.message}`);
        }
      }
    }

    // Adicionar colunas na tabela acoes_corretivas
    console.log('\n=== TABELA acoes_corretivas ===');

    const acColumns = [
      { name: 'emitente', type: 'VARCHAR(255)' },
      { name: 'processos_envolvidos', type: 'JSONB' },
      { name: 'causas', type: 'TEXT' },
      { name: 'subcausas', type: 'TEXT' },
      { name: 'acoes', type: 'TEXT' },
      { name: 'status_acoes', type: 'VARCHAR(50)' },
      { name: 'anexos', type: 'JSONB' },
      { name: 'falha', type: 'TEXT' },
      { name: 'responsaveis', type: 'VARCHAR(255)' }
    ];

    for (const col of acColumns) {
      try {
        await client.query(`
          ALTER TABLE acoes_corretivas
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`✓ Coluna ${col.name} adicionada/verificada`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`→ Coluna ${col.name} já existe`);
        } else {
          console.log(`✗ Erro ao adicionar ${col.name}: ${err.message}`);
        }
      }
    }

    // Adicionar colunas na tabela reclamacoes_clientes
    console.log('\n=== TABELA reclamacoes_clientes ===');

    const rcColumns = [
      { name: 'data_emissao', type: 'TIMESTAMP' },
      { name: 'nome_emitente', type: 'VARCHAR(255)' },
      { name: 'nome_cliente', type: 'VARCHAR(255)' },
      { name: 'numero_nf', type: 'VARCHAR(100)' },
      { name: 'codigo_equipamento', type: 'TEXT' },
      { name: 'local_instalado', type: 'VARCHAR(255)' },
      { name: 'acao_imediata', type: 'TEXT' },
      { name: 'anexos', type: 'JSONB' }
    ];

    for (const col of rcColumns) {
      try {
        await client.query(`
          ALTER TABLE reclamacoes_clientes
          ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
        `);
        console.log(`✓ Coluna ${col.name} adicionada/verificada`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`→ Coluna ${col.name} já existe`);
        } else {
          console.log(`✗ Erro ao adicionar ${col.name}: ${err.message}`);
        }
      }
    }

    console.log('\n========================================');
    console.log('Migração concluída com sucesso!');
    console.log('========================================');

  } catch (error) {
    console.error('Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addQualityColumns().catch(console.error);
