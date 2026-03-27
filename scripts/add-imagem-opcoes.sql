-- Adiciona coluna imagem_url na tabela de opcionais
ALTER TABLE crm_precos_opcoes ADD COLUMN IF NOT EXISTS imagem_url TEXT;
