-- Migration: Tabela de analise de orcamento (fluxo de aprovacao comercial)
-- Data: 2026-02-26

-- Tabela principal de analise/aprovacao
CREATE TABLE IF NOT EXISTS crm_analise_orcamento (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  proposta_id INTEGER NOT NULL REFERENCES crm_propostas(id),
  vendedor_id INTEGER NOT NULL REFERENCES crm_vendedores(id),
  status VARCHAR(20) DEFAULT 'PENDENTE',
  desconto_percentual_ajustado DECIMAL(5,2),
  prazo_entrega_ajustado VARCHAR(50),
  garantia_meses_ajustado INTEGER,
  forma_pagamento_ajustada TEXT,
  observacoes_analista TEXT,
  pdf_data TEXT,
  pdf_gerado_em TIMESTAMP WITH TIME ZONE,
  mensagem_whatsapp_id_analista VARCHAR(100),
  mensagem_whatsapp_id_vendedor VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analise_token ON crm_analise_orcamento(token);
CREATE INDEX IF NOT EXISTS idx_analise_proposta ON crm_analise_orcamento(proposta_id);
CREATE INDEX IF NOT EXISTS idx_analise_status ON crm_analise_orcamento(status);

-- Coluna JSONB para snapshot do configurador na proposta
ALTER TABLE crm_propostas ADD COLUMN IF NOT EXISTS dados_configurador JSONB;
