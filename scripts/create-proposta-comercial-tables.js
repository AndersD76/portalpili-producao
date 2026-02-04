require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  console.log('\n=== Criando tabelas para Proposta Comercial Completa ===\n');

  try {
    // Tabela principal de propostas comerciais
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_propostas_comerciais (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(20) UNIQUE NOT NULL,

        -- Vendedor/Representante
        vendedor_id INTEGER REFERENCES usuarios(id),
        vendedor_nome VARCHAR(255),
        vendedor_email VARCHAR(255),

        -- Região
        regiao VARCHAR(50), -- SUL, SUDESTE, CENTRO-OESTE, NORDESTE, NORTE, MERCADO EXTERNO

        -- Cliente
        cliente_id INTEGER REFERENCES crm_clientes(id),
        cliente_cnpj VARCHAR(30),
        cliente_razao_social VARCHAR(255),
        cliente_pais VARCHAR(50) DEFAULT 'Brasil',
        cliente_estado VARCHAR(2),
        cliente_municipio VARCHAR(100),
        cliente_contato TEXT, -- Email/telefone/WhatsApp

        -- Datas e Prazos
        prazo_entrega_dias INTEGER, -- 120, 150, 180 ou outro
        data_visita DATE,
        validade_dias INTEGER DEFAULT 15,
        chance_negocio INTEGER, -- 10 (muito provável), 7 (provável), 4 (pouco provável)

        -- Produto
        tipo_produto VARCHAR(20) NOT NULL, -- TOMBADOR ou COLETOR

        -- Configuração do Produto (JSONB para flexibilidade)
        configuracao_produto JSONB DEFAULT '{}',

        -- Valores
        valor_equipamento DECIMAL(15,2),
        valor_opcionais DECIMAL(15,2) DEFAULT 0,
        valor_frete DECIMAL(15,2) DEFAULT 0,
        valor_montagem DECIMAL(15,2) DEFAULT 0,
        valor_total DECIMAL(15,2),
        desconto_percentual DECIMAL(5,2) DEFAULT 0,
        comissao_percentual DECIMAL(5,2) DEFAULT 0,

        -- Pagamento e Frete
        forma_pagamento TEXT,
        tipo_frete VARCHAR(10), -- CIF ou FOB
        quantidade_frete INTEGER DEFAULT 1,
        valor_unitario_frete DECIMAL(15,2),

        -- Deslocamento Técnico
        deslocamentos_tecnicos INTEGER DEFAULT 1,
        valor_diaria_tecnica DECIMAL(15,2),

        -- Garantia
        garantia_meses INTEGER DEFAULT 6, -- 6 ou 12

        -- Informações Adicionais
        outros_requisitos TEXT,
        observacoes TEXT,
        informacoes_adicionais TEXT,

        -- Análise Crítica
        analise_critica JSONB DEFAULT '{}',
        criterios_atendidos VARCHAR(20), -- SIM, NÃO, PARCIALMENTE
        acao_necessaria TEXT,

        -- Status
        status VARCHAR(30) DEFAULT 'RASCUNHO', -- RASCUNHO, ENVIADA, APROVADA, REJEITADA, FECHADA

        -- Auditoria
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES usuarios(id),
        updated_by INTEGER REFERENCES usuarios(id)
      )
    `);
    console.log('✓ Tabela crm_propostas_comerciais criada');

    // Tabela de itens da proposta (equipamentos)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_proposta_itens (
        id SERIAL PRIMARY KEY,
        proposta_id INTEGER REFERENCES crm_propostas_comerciais(id) ON DELETE CASCADE,

        tipo_produto VARCHAR(20) NOT NULL, -- TOMBADOR ou COLETOR
        quantidade INTEGER DEFAULT 1,

        -- Configuração específica do item
        tamanho INTEGER, -- metros para tombador
        tipo VARCHAR(20), -- FIXO ou MÓVEL
        comprimento_trilhos DECIMAL(10,2), -- para móvel

        -- Preços
        preco_base DECIMAL(15,2),
        preco_opcionais DECIMAL(15,2) DEFAULT 0,
        preco_total DECIMAL(15,2),

        -- Configuração detalhada (JSONB)
        configuracao JSONB DEFAULT '{}',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tabela crm_proposta_itens criada');

    // Tabela de anexos da proposta
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_proposta_anexos (
        id SERIAL PRIMARY KEY,
        proposta_id INTEGER REFERENCES crm_propostas_comerciais(id) ON DELETE CASCADE,
        tipo_produto VARCHAR(20), -- TOMBADOR ou COLETOR
        numero_anexo INTEGER, -- 1 a 5
        arquivo_url TEXT,
        descricao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tabela crm_proposta_anexos criada');

    // Tabela de opções de configuração (para o configurador)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_config_opcoes (
        id SERIAL PRIMARY KEY,
        grupo VARCHAR(50) NOT NULL, -- INCLINAÇÃO, TIPO_MOLDURA, etc.
        codigo VARCHAR(100) NOT NULL,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        preco DECIMAL(15,2) DEFAULT 0,
        tamanhos_aplicaveis VARCHAR(100), -- ex: "11,12,18,21,26,30" ou "ALL"
        tipo_produto VARCHAR(20), -- TOMBADOR, COLETOR ou AMBOS
        ordem INTEGER DEFAULT 0,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Tabela crm_config_opcoes criada');

    // Criar índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_propostas_comerciais_numero ON crm_propostas_comerciais(numero);
      CREATE INDEX IF NOT EXISTS idx_propostas_comerciais_cliente ON crm_propostas_comerciais(cliente_id);
      CREATE INDEX IF NOT EXISTS idx_propostas_comerciais_vendedor ON crm_propostas_comerciais(vendedor_id);
      CREATE INDEX IF NOT EXISTS idx_propostas_comerciais_status ON crm_propostas_comerciais(status);
      CREATE INDEX IF NOT EXISTS idx_proposta_itens_proposta ON crm_proposta_itens(proposta_id);
      CREATE INDEX IF NOT EXISTS idx_proposta_anexos_proposta ON crm_proposta_anexos(proposta_id);
      CREATE INDEX IF NOT EXISTS idx_config_opcoes_grupo ON crm_config_opcoes(grupo);
    `);
    console.log('✓ Índices criados');

    // Criar sequência para número da proposta
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS proposta_comercial_seq START 1;
    `);
    console.log('✓ Sequência criada');

    // Criar função para gerar número da proposta
    await pool.query(`
      CREATE OR REPLACE FUNCTION gerar_numero_proposta()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.numero IS NULL THEN
          NEW.numero := 'PC-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('proposta_comercial_seq')::text, 5, '0');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_gerar_numero_proposta ON crm_propostas_comerciais;
      CREATE TRIGGER trigger_gerar_numero_proposta
        BEFORE INSERT ON crm_propostas_comerciais
        FOR EACH ROW
        EXECUTE FUNCTION gerar_numero_proposta();
    `);
    console.log('✓ Trigger para número automático criado');

    console.log('\n✅ Todas as tabelas criadas com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

createTables();
