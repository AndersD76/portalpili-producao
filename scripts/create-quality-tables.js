const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createQualityTables() {
  const client = await pool.connect();

  try {
    console.log('Iniciando criação das tabelas do módulo de Qualidade...\n');

    // Tabela de Não Conformidades
    console.log('Criando tabela nao_conformidades...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS nao_conformidades (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,
        data_ocorrencia TIMESTAMP NOT NULL,
        local_ocorrencia VARCHAR(255),
        setor_responsavel VARCHAR(100),

        -- Classificação
        tipo VARCHAR(50) NOT NULL,
        origem VARCHAR(50),
        gravidade VARCHAR(20),

        -- Descrição
        descricao TEXT NOT NULL,
        evidencias JSONB,
        produtos_afetados TEXT,
        quantidade_afetada INTEGER,

        -- Detecção
        detectado_por VARCHAR(255),
        detectado_por_id INTEGER,

        -- Disposição
        disposicao VARCHAR(50),
        disposicao_descricao TEXT,

        -- Contenção
        acao_contencao TEXT,
        data_contencao TIMESTAMP,
        responsavel_contencao VARCHAR(255),

        -- Status
        status VARCHAR(30) DEFAULT 'ABERTA',
        acao_corretiva_id INTEGER,

        -- Auditoria
        created_by INTEGER,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_by INTEGER,
        closed_at TIMESTAMP
      )
    `);
    console.log('✓ Tabela nao_conformidades criada com sucesso!\n');

    // Tabela de Reclamações de Clientes
    console.log('Criando tabela reclamacoes_clientes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reclamacoes_clientes (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,
        data_reclamacao TIMESTAMP NOT NULL,

        -- Dados do Cliente
        cliente_nome VARCHAR(255) NOT NULL,
        cliente_contato VARCHAR(255),
        cliente_email VARCHAR(255),
        cliente_telefone VARCHAR(50),

        -- Referência OPD
        numero_opd VARCHAR(50),
        numero_serie VARCHAR(100),

        -- Detalhes da Reclamação
        tipo_reclamacao VARCHAR(50),
        descricao TEXT NOT NULL,
        evidencias JSONB,

        -- Avaliação
        impacto VARCHAR(50),
        procedencia BOOLEAN,
        justificativa_procedencia TEXT,

        -- Resposta
        resposta_cliente TEXT,
        data_resposta TIMESTAMP,
        responsavel_resposta VARCHAR(255),

        -- Resolução
        acao_tomada TEXT,
        data_resolucao TIMESTAMP,
        cliente_satisfeito BOOLEAN,

        -- Links
        nao_conformidade_id INTEGER REFERENCES nao_conformidades(id),
        acao_corretiva_id INTEGER,

        -- Status
        status VARCHAR(30) DEFAULT 'ABERTA',

        -- Auditoria
        created_by INTEGER,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tabela reclamacoes_clientes criada com sucesso!\n');

    // Tabela de Ações Corretivas
    console.log('Criando tabela acoes_corretivas...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS acoes_corretivas (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,
        data_abertura TIMESTAMP NOT NULL,

        -- Origem
        origem_tipo VARCHAR(50) NOT NULL,
        origem_id INTEGER,
        origem_descricao TEXT,

        -- Análise de Causa Raiz
        descricao_problema TEXT NOT NULL,
        analise_causa_raiz TEXT,
        metodo_analise VARCHAR(50),
        causa_raiz_identificada TEXT,

        -- Ações
        acoes JSONB,

        -- Verificação de Eficácia
        verificacao_eficacia TEXT,
        data_verificacao TIMESTAMP,
        responsavel_verificacao VARCHAR(255),
        acao_eficaz BOOLEAN,

        -- Padronização
        padronizacao_realizada BOOLEAN,
        descricao_padronizacao TEXT,
        documentos_atualizados JSONB,

        -- Responsáveis
        responsavel_principal VARCHAR(255),
        responsavel_principal_id INTEGER,
        equipe JSONB,

        -- Datas
        prazo_conclusao TIMESTAMP,
        data_conclusao TIMESTAMP,

        -- Status
        status VARCHAR(30) DEFAULT 'ABERTA',

        -- Auditoria
        created_by INTEGER,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tabela acoes_corretivas criada com sucesso!\n');

    // Adicionar referência de ação corretiva na tabela de reclamações (se não existir)
    console.log('Adicionando constraint de foreign key...');
    try {
      await client.query(`
        ALTER TABLE reclamacoes_clientes
        ADD CONSTRAINT fk_acao_corretiva
        FOREIGN KEY (acao_corretiva_id)
        REFERENCES acoes_corretivas(id)
      `);
      console.log('✓ Foreign key adicionada com sucesso!\n');
    } catch (err) {
      if (err.code === '42710') {
        console.log('→ Foreign key já existe, pulando...\n');
      } else {
        throw err;
      }
    }

    // Criar índices
    console.log('Criando índices...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nc_status ON nao_conformidades(status);
      CREATE INDEX IF NOT EXISTS idx_nc_data ON nao_conformidades(data_ocorrencia);
      CREATE INDEX IF NOT EXISTS idx_nc_tipo ON nao_conformidades(tipo);

      CREATE INDEX IF NOT EXISTS idx_rec_status ON reclamacoes_clientes(status);
      CREATE INDEX IF NOT EXISTS idx_rec_cliente ON reclamacoes_clientes(cliente_nome);
      CREATE INDEX IF NOT EXISTS idx_rec_data ON reclamacoes_clientes(data_reclamacao);

      CREATE INDEX IF NOT EXISTS idx_ac_status ON acoes_corretivas(status);
      CREATE INDEX IF NOT EXISTS idx_ac_prazo ON acoes_corretivas(prazo_conclusao);
      CREATE INDEX IF NOT EXISTS idx_ac_origem ON acoes_corretivas(origem_tipo);
    `);
    console.log('✓ Índices criados com sucesso!\n');

    // Criar sequências para numeração automática
    console.log('Criando sequências para numeração automática...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS seq_nao_conformidade START WITH 1;
      CREATE SEQUENCE IF NOT EXISTS seq_reclamacao_cliente START WITH 1;
      CREATE SEQUENCE IF NOT EXISTS seq_acao_corretiva START WITH 1;
    `);
    console.log('✓ Sequências criadas com sucesso!\n');

    console.log('========================================');
    console.log('Todas as tabelas do módulo de Qualidade foram criadas com sucesso!');
    console.log('========================================');

  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createQualityTables().catch(console.error);
