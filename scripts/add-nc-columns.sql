-- Adicionar colunas que faltam na tabela nao_conformidades

-- Colunas para o formulário de NC
ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS anexos JSONB;
ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS turno_trabalho VARCHAR(50);
ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS numero_opd VARCHAR(100);
ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS quantidade_itens INTEGER;
ALTER TABLE nao_conformidades ADD COLUMN IF NOT EXISTS data_contencao TIMESTAMP;

-- Verificar se as colunas foram adicionadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'nao_conformidades'
ORDER BY ordinal_position;
