-- Garantir colunas que podem estar faltando nas tabelas de status check
-- (CREATE TABLE IF NOT EXISTS não adiciona colunas a tabelas já existentes)

ALTER TABLE crm_status_checks
  ADD COLUMN IF NOT EXISTS respondido_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE crm_status_check_items
  ADD COLUMN IF NOT EXISTS observacao TEXT,
  ADD COLUMN IF NOT EXISTS respondido_at TIMESTAMP WITH TIME ZONE;
