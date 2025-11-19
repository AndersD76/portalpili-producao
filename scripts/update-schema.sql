-- Script de atualização do schema do banco de dados
-- Portal Pili - Sistema de Controle de OPDs

-- ============================================
-- 1. ATUALIZAR TABELA DE ATIVIDADES
-- ============================================

-- Adicionar coluna de dias programados se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registros_atividades'
                   AND column_name = 'dias_programados') THEN
        ALTER TABLE registros_atividades ADD COLUMN dias_programados INTEGER;
    END IF;
END $$;

-- Adicionar coluna para anexos de formulários
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registros_atividades'
                   AND column_name = 'formulario_anexo') THEN
        ALTER TABLE registros_atividades ADD COLUMN formulario_anexo JSONB;
    END IF;
END $$;

-- Adicionar coluna para indicar se requer formulário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registros_atividades'
                   AND column_name = 'requer_formulario') THEN
        ALTER TABLE registros_atividades ADD COLUMN requer_formulario BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adicionar coluna para tipo de formulário
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'registros_atividades'
                   AND column_name = 'tipo_formulario') THEN
        ALTER TABLE registros_atividades ADD COLUMN tipo_formulario VARCHAR(100);
    END IF;
END $$;

-- ============================================
-- 2. CRIAR TABELA DE CONFIGURAÇÃO DE ETAPAS
-- ============================================

CREATE TABLE IF NOT EXISTS configuracao_etapas (
    id SERIAL PRIMARY KEY,
    nome_etapa VARCHAR(255) NOT NULL UNIQUE,
    ordem INTEGER NOT NULL,
    responsavel_padrao VARCHAR(100),
    dias_padrao INTEGER DEFAULT 1,
    requer_formulario BOOLEAN DEFAULT FALSE,
    tipo_formulario VARCHAR(100),
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created TIMESTAMP DEFAULT NOW(),
    updated TIMESTAMP DEFAULT NOW()
);

-- Inserir as etapas padrão
INSERT INTO configuracao_etapas (nome_etapa, ordem, responsavel_padrao, dias_padrao, requer_formulario, tipo_formulario) VALUES
('LIBERAÇÃO FINANCEIRA', 1, 'FINANCEIRO', 1, FALSE, NULL),
('CRIAÇÃO DA OPD', 2, 'PCP', 1, FALSE, NULL),
('DEFINIÇÃO DA OBRA CIVIL', 3, 'PCP', 3, FALSE, NULL),
('REUNIÃO DE START 1', 4, 'PCP', 1, FALSE, NULL),
('ENGENHARIA (MEC)', 5, 'ENGENHARIA (MEC)', 10, FALSE, NULL),
('ENGENHARIA (ELE/HID)', 6, 'ENGENHARIA (ELE/HID)', 10, FALSE, NULL),
('REVISÃO FINAL DE PROJETOS', 7, 'PCP', 1, FALSE, NULL),
('REUNIÃO DE START 2', 8, 'PCP', 1, FALSE, NULL),
('PROGRAMAÇÃO DAS LINHAS', 9, 'PCP', 1, FALSE, NULL),
('RESERVAS DE COMP/FAB', 10, 'PCP', 2, FALSE, NULL),
('IMPRIMIR LISTAS E PLANOS', 11, 'PCP', 1, FALSE, NULL),
('ASSINATURA DOS PLANOS DE CORTE', 12, 'ENGENHARIA', 1, FALSE, NULL),
('IMPRIMIR OF/ETIQUETA', 13, 'PCP', 1, FALSE, NULL),
('PROGRAMAÇÃO DE CORTE', 14, 'PCP', 1, FALSE, NULL),
('ENTREGAR OF''S/LISTAS PARA ALMOX', 15, 'PCP', 1, FALSE, NULL),
('PRODUÇÃO', 16, 'PRODUÇÃO', 30, TRUE, 'PREPARACAO'),
('EXPEDIÇÃO', 17, 'EXPEDIÇÃO', 2, FALSE, NULL),
('DESEMBARQUE E PRÉ INSTALAÇÃO', 18, 'INSTALAÇÃO', 1, TRUE, 'DESEMBARQUE_PRE_INSTALACAO'),
('LIBERAÇÃO E EMBARQUE', 19, 'EXPEDIÇÃO', 1, TRUE, 'LIBERACAO_EMBARQUE'),
('INSTALAÇÃO E ENTREGA', 20, 'INSTALAÇÃO', 5, TRUE, 'ENTREGA')
ON CONFLICT (nome_etapa) DO NOTHING;

-- ============================================
-- 3. CRIAR TABELA DE FORMULÁRIOS PREENCHIDOS
-- ============================================

CREATE TABLE IF NOT EXISTS formularios_preenchidos (
    id SERIAL PRIMARY KEY,
    atividade_id INTEGER REFERENCES registros_atividades(id),
    numero_opd VARCHAR(255) NOT NULL,
    tipo_formulario VARCHAR(100) NOT NULL,
    dados_formulario JSONB NOT NULL,
    anexos JSONB,
    preenchido_por VARCHAR(255),
    data_preenchimento TIMESTAMP DEFAULT NOW(),
    created TIMESTAMP DEFAULT NOW(),
    updated TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_formularios_atividade ON formularios_preenchidos(atividade_id);
CREATE INDEX IF NOT EXISTS idx_formularios_opd ON formularios_preenchidos(numero_opd);
CREATE INDEX IF NOT EXISTS idx_formularios_tipo ON formularios_preenchidos(tipo_formulario);

-- ============================================
-- 4. CRIAR TABELA DE NOTIFICAÇÕES
-- ============================================

CREATE TABLE IF NOT EXISTS notificacoes (
    id SERIAL PRIMARY KEY,
    numero_opd VARCHAR(255) NOT NULL,
    atividade_id INTEGER REFERENCES registros_atividades(id),
    destinatario_email VARCHAR(255) NOT NULL,
    destinatario_nome VARCHAR(255),
    assunto VARCHAR(500) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'NOTIFICACAO_ETAPA',
    status VARCHAR(50) DEFAULT 'PENDENTE',
    data_envio TIMESTAMP,
    tentativas INTEGER DEFAULT 0,
    erro TEXT,
    created TIMESTAMP DEFAULT NOW(),
    updated TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_notificacoes_opd ON notificacoes(numero_opd);
CREATE INDEX IF NOT EXISTS idx_notificacoes_status ON notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes(tipo);

-- ============================================
-- 5. CRIAR TABELA DE CONFIGURAÇÃO DE EMAILS
-- ============================================

CREATE TABLE IF NOT EXISTS configuracao_emails (
    id SERIAL PRIMARY KEY,
    responsavel VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    nome VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created TIMESTAMP DEFAULT NOW(),
    updated TIMESTAMP DEFAULT NOW()
);

-- Inserir emails padrão (você precisará atualizar com emails reais)
INSERT INTO configuracao_emails (responsavel, email, nome) VALUES
('FINANCEIRO', 'financeiro@empresa.com', 'Financeiro'),
('PCP', 'pcp@empresa.com', 'PCP'),
('ENGENHARIA', 'engenharia@empresa.com', 'Engenharia'),
('ENGENHARIA (MEC)', 'engenharia.mec@empresa.com', 'Engenharia Mecânica'),
('ENGENHARIA (ELE/HID)', 'engenharia.ele@empresa.com', 'Engenharia Elétrica/Hidráulica'),
('PRODUÇÃO', 'producao@empresa.com', 'Produção'),
('EXPEDIÇÃO', 'expedicao@empresa.com', 'Expedição'),
('INSTALAÇÃO', 'instalacao@empresa.com', 'Instalação')
ON CONFLICT (responsavel) DO NOTHING;

-- ============================================
-- 6. CRIAR VIEW PARA DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW vw_status_opds AS
SELECT
    o.id,
    o.numero,
    o.tipo_opd,
    o.responsavel_opd,
    o.data_pedido,
    o.previsao_inicio,
    o.previsao_termino,
    o.inicio_producao,
    COUNT(DISTINCT ra.id) as total_atividades,
    COUNT(DISTINCT CASE WHEN ra.status = 'CONCLUÍDA' THEN ra.id END) as atividades_concluidas,
    COUNT(DISTINCT CASE WHEN ra.status = 'EM ANDAMENTO' THEN ra.id END) as atividades_em_andamento,
    COUNT(DISTINCT CASE WHEN ra.status = 'A REALIZAR' THEN ra.id END) as atividades_a_realizar,
    ROUND(
        (COUNT(DISTINCT CASE WHEN ra.status = 'CONCLUÍDA' THEN ra.id END)::DECIMAL /
         NULLIF(COUNT(DISTINCT ra.id), 0) * 100), 2
    ) as percentual_conclusao,
    o.created,
    o.updated
FROM opds o
LEFT JOIN registros_atividades ra ON o.numero = ra.numero_opd
GROUP BY o.id, o.numero, o.tipo_opd, o.responsavel_opd,
         o.data_pedido, o.previsao_inicio, o.previsao_termino,
         o.inicio_producao, o.created, o.updated;

-- ============================================
-- 7. ATUALIZAR ATIVIDADES EXISTENTES
-- ============================================

-- Marcar quais atividades requerem formulário baseado no nome
UPDATE registros_atividades
SET requer_formulario = TRUE,
    tipo_formulario = 'PREPARACAO'
WHERE atividade LIKE '%PRODUÇÃO%' OR atividade = 'PRODUÇÃO';

UPDATE registros_atividades
SET requer_formulario = TRUE,
    tipo_formulario = 'DESEMBARQUE_PRE_INSTALACAO'
WHERE atividade LIKE '%DESEMBARQUE%' OR atividade LIKE '%PRÉ INSTALAÇÃO%';

UPDATE registros_atividades
SET requer_formulario = TRUE,
    tipo_formulario = 'LIBERACAO_EMBARQUE'
WHERE atividade LIKE '%LIBERAÇÃO%EMBARQUE%' OR atividade LIKE '%EMBARQUE%';

UPDATE registros_atividades
SET requer_formulario = TRUE,
    tipo_formulario = 'ENTREGA'
WHERE atividade LIKE '%ENTREGA%' OR atividade LIKE '%INSTALAÇÃO%ENTREGA%';

-- ============================================
-- 8. CRIAR FUNÇÃO PARA AUTO-INCREMENTO
-- ============================================

CREATE OR REPLACE FUNCTION atualizar_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar timestamp automaticamente
DO $$
BEGIN
    DROP TRIGGER IF EXISTS trigger_opds_updated ON opds;
    CREATE TRIGGER trigger_opds_updated
        BEFORE UPDATE ON opds
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_updated_timestamp();

    DROP TRIGGER IF EXISTS trigger_atividades_updated ON registros_atividades;
    CREATE TRIGGER trigger_atividades_updated
        BEFORE UPDATE ON registros_atividades
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_updated_timestamp();

    DROP TRIGGER IF EXISTS trigger_formularios_updated ON formularios_preenchidos;
    CREATE TRIGGER trigger_formularios_updated
        BEFORE UPDATE ON formularios_preenchidos
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_updated_timestamp();
END $$;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

SELECT 'Schema atualizado com sucesso!' as mensagem;
