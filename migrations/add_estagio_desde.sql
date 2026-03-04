-- Migration: Adicionar coluna estagio_desde para rastrear quando a oportunidade entrou no estagio atual
-- Data: 2026-03-04

ALTER TABLE crm_oportunidades
  ADD COLUMN IF NOT EXISTS estagio_desde TIMESTAMPTZ DEFAULT NOW();

-- Inicializa estagio_desde com updated_at para registros existentes (melhor aproximacao disponivel)
UPDATE crm_oportunidades
  SET estagio_desde = updated_at
  WHERE estagio_desde IS NULL;
