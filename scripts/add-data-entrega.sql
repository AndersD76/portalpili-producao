-- Adicionar coluna data_entrega na tabela OPDs
ALTER TABLE opds
ADD COLUMN IF NOT EXISTS data_entrega TIMESTAMP;

COMMENT ON COLUMN opds.data_entrega IS 'Data prevista de entrega da OPD ao cliente';
