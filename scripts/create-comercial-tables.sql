-- =============================================
-- SISTEMA COMERCIAL PILI - SCHEMA COMPLETO
-- CRM + Propostas + Preços Configuráveis + IA
-- =============================================

-- =============================================
-- 1. TABELAS CRM
-- =============================================

-- Vendedores (equipe comercial)
CREATE TABLE IF NOT EXISTS crm_vendedores (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    avatar_url TEXT,
    cargo VARCHAR(50) DEFAULT 'VENDEDOR', -- VENDEDOR, GERENTE, DIRETOR
    comissao_padrao DECIMAL(5,4) DEFAULT 0.048,
    meta_mensal DECIMAL(12,2),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clientes
CREATE TABLE IF NOT EXISTS crm_clientes (
    id SERIAL PRIMARY KEY,
    -- Dados básicos
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(200),
    cpf_cnpj VARCHAR(20) UNIQUE,
    inscricao_estadual VARCHAR(20),
    -- Dados da Receita
    cnae_codigo VARCHAR(20),
    cnae_descricao VARCHAR(200),
    natureza_juridica VARCHAR(100),
    porte VARCHAR(20), -- MEI, ME, EPP, MEDIO, GRANDE
    capital_social DECIMAL(15,2),
    data_abertura DATE,
    situacao_receita VARCHAR(20), -- ATIVA, BAIXADA, SUSPENSA, INAPTA
    -- Contato principal
    contato_nome VARCHAR(100),
    contato_cargo VARCHAR(50),
    email VARCHAR(100),
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    -- Endereço
    cep VARCHAR(10),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    municipio VARCHAR(100),
    estado VARCHAR(2),
    pais VARCHAR(50) DEFAULT 'Brasil',
    regiao VARCHAR(20), -- SUL, SUDESTE, CENTRO-OESTE, NORDESTE, NORTE
    -- Segmentação
    segmento VARCHAR(50), -- AGRO, COOPERATIVA, CEREALISTA, TRADING, INDUSTRIA, FAZENDA
    origem VARCHAR(30), -- INDICACAO, FEIRA, SITE, PROSPECCAO, MARKETING, TELEFONE
    -- CRM
    vendedor_id INTEGER REFERENCES crm_vendedores(id),
    status VARCHAR(20) DEFAULT 'ATIVO', -- ATIVO, INATIVO, BLOQUEADO
    temperatura VARCHAR(10) DEFAULT 'MORNO', -- FRIO, MORNO, QUENTE
    tags TEXT[], -- array de tags
    -- Financeiro
    limite_credito DECIMAL(12,2),
    prazo_pagamento INTEGER, -- dias
    -- Score IA
    score_potencial INTEGER, -- 0-100
    ultima_analise_ia TIMESTAMP,
    -- Metadados
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contatos (múltiplos por cliente)
CREATE TABLE IF NOT EXISTS crm_contatos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES crm_clientes(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50),
    departamento VARCHAR(50),
    email VARCHAR(100),
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    principal BOOLEAN DEFAULT false,
    decisor BOOLEAN DEFAULT false, -- É decisor de compra?
    ativo BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Oportunidades (Pipeline de Vendas)
CREATE TABLE IF NOT EXISTS crm_oportunidades (
    id SERIAL PRIMARY KEY,
    -- Relacionamentos
    cliente_id INTEGER REFERENCES crm_clientes(id),
    vendedor_id INTEGER REFERENCES crm_vendedores(id),
    contato_id INTEGER REFERENCES crm_contatos(id),
    -- Dados da oportunidade
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    produto VARCHAR(20), -- TOMBADOR, COLETOR
    tamanho_interesse INTEGER, -- 11, 12, 18, 21, 26, 30 ou graus coletor
    tipo_interesse VARCHAR(20), -- FIXO, MOVEL
    -- Pipeline
    estagio VARCHAR(30) NOT NULL DEFAULT 'PROSPECCAO',
    -- PROSPECCAO, QUALIFICACAO, PROPOSTA, NEGOCIACAO, FECHAMENTO
    probabilidade INTEGER DEFAULT 10 CHECK (probabilidade BETWEEN 0 AND 100),
    -- Valores
    valor_estimado DECIMAL(12,2),
    valor_final DECIMAL(12,2),
    -- Datas
    data_abertura DATE DEFAULT CURRENT_DATE,
    data_previsao_fechamento DATE,
    data_fechamento DATE,
    dias_no_estagio INTEGER DEFAULT 0,
    -- Resultado
    status VARCHAR(20) DEFAULT 'ABERTA', -- ABERTA, GANHA, PERDIDA, CANCELADA
    motivo_perda VARCHAR(100),
    concorrente VARCHAR(100),
    justificativa_perda TEXT,
    -- Metadados
    fonte VARCHAR(50), -- Como chegou a oportunidade
    temperatura VARCHAR(10) DEFAULT 'MORNO',
    proxima_acao TEXT,
    data_proxima_acao DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Atividades CRM (Follow-ups, Tarefas, Histórico)
CREATE TABLE IF NOT EXISTS crm_atividades (
    id SERIAL PRIMARY KEY,
    -- Relacionamentos
    cliente_id INTEGER REFERENCES crm_clientes(id),
    oportunidade_id INTEGER REFERENCES crm_oportunidades(id),
    vendedor_id INTEGER REFERENCES crm_vendedores(id),
    -- Tipo de atividade
    tipo VARCHAR(30) NOT NULL, -- LIGACAO, EMAIL, REUNIAO, VISITA, TAREFA, NOTA, WHATSAPP, PROPOSTA
    -- Dados
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    -- Agendamento
    data_agendada TIMESTAMP,
    data_conclusao TIMESTAMP,
    duracao_minutos INTEGER,
    -- Status
    status VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, CONCLUIDA, CANCELADA, ATRASADA
    prioridade VARCHAR(10) DEFAULT 'MEDIA', -- BAIXA, MEDIA, ALTA, URGENTE
    -- Resultado (para ligações/reuniões)
    resultado VARCHAR(50), -- ATENDEU, NAO_ATENDEU, REMARCOU, INTERESSADO, SEM_INTERESSE, FECHOU
    notas_resultado TEXT,
    -- Lembrete
    lembrete_minutos INTEGER, -- minutos antes para lembrar
    lembrete_enviado BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interações (Histórico automático)
CREATE TABLE IF NOT EXISTS crm_interacoes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES crm_clientes(id),
    oportunidade_id INTEGER REFERENCES crm_oportunidades(id),
    proposta_id INTEGER,
    vendedor_id INTEGER REFERENCES crm_vendedores(id),
    tipo VARCHAR(50) NOT NULL,
    -- CLIENTE_CRIADO, PROPOSTA_CRIADA, PROPOSTA_ENVIADA, PROPOSTA_APROVADA,
    -- PROPOSTA_REJEITADA, EMAIL_ENVIADO, STATUS_ALTERADO, ESTAGIO_ALTERADO,
    -- ATIVIDADE_CONCLUIDA, OPORTUNIDADE_GANHA, OPORTUNIDADE_PERDIDA
    descricao TEXT,
    dados JSONB, -- dados adicionais em JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metas
CREATE TABLE IF NOT EXISTS crm_metas (
    id SERIAL PRIMARY KEY,
    vendedor_id INTEGER REFERENCES crm_vendedores(id),
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    meta_valor DECIMAL(12,2),
    meta_quantidade INTEGER,
    realizado_valor DECIMAL(12,2) DEFAULT 0,
    realizado_quantidade INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendedor_id, ano, mes)
);

-- =============================================
-- 2. TABELAS DE PREÇOS CONFIGURÁVEIS
-- =============================================

-- Categorias de opcionais
CREATE TABLE IF NOT EXISTS crm_precos_categorias (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    produto VARCHAR(20), -- TOMBADOR, COLETOR, AMBOS
    icone VARCHAR(50), -- nome do ícone (lucide)
    cor VARCHAR(20), -- cor para UI
    ordem_exibicao INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Preços base por tamanho/produto
CREATE TABLE IF NOT EXISTS crm_precos_base (
    id SERIAL PRIMARY KEY,
    produto VARCHAR(20) NOT NULL, -- TOMBADOR, COLETOR
    tamanho INTEGER NOT NULL, -- metros ou graus
    tipo VARCHAR(20), -- FIXO, MOVEL, ROTATIVO (NULL = único)
    descricao VARCHAR(200),
    preco DECIMAL(12,2) NOT NULL,
    -- Dados técnicos padrão
    capacidade VARCHAR(50),
    aplicacao TEXT,
    modelo VARCHAR(50),
    qt_cilindros INTEGER,
    qt_motores INTEGER,
    qt_oleo INTEGER,
    qt_trava_chassi INTEGER,
    qt_trava_roda INTEGER DEFAULT 1,
    angulo_inclinacao VARCHAR(20),
    -- Mangueiras/Cabos padrão
    mangueiras_padrao INTEGER DEFAULT 15, -- metros
    cabos_eletricos_padrao INTEGER DEFAULT 15, -- metros
    -- Controle
    ativo BOOLEAN DEFAULT true,
    vigencia_inicio DATE DEFAULT CURRENT_DATE,
    vigencia_fim DATE,
    ordem_exibicao INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Opcionais/Acessórios configuráveis
CREATE TABLE IF NOT EXISTS crm_precos_opcoes (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES crm_precos_categorias(id),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    -- Preço
    preco DECIMAL(12,2) NOT NULL,
    preco_tipo VARCHAR(20) DEFAULT 'FIXO', -- FIXO, POR_METRO, POR_UNIDADE, POR_LITRO, PERCENTUAL
    -- Regras de aplicação
    produto VARCHAR(20), -- TOMBADOR, COLETOR, AMBOS
    tamanhos_aplicaveis INTEGER[], -- NULL = todos, [21,26,30] = específicos
    tipos_aplicaveis VARCHAR(20)[], -- NULL = todos, ['MOVEL'] = específico
    -- Regras de negócio
    obrigatorio BOOLEAN DEFAULT false,
    incluso_no_base BOOLEAN DEFAULT false, -- já incluso no preço base
    quantidade_minima INTEGER DEFAULT 0,
    quantidade_maxima INTEGER,
    quantidade_padrao INTEGER DEFAULT 1,
    permite_quantidade BOOLEAN DEFAULT true,
    -- Exclusividade
    grupo_exclusivo VARCHAR(50), -- Itens do mesmo grupo são mutuamente exclusivos
    requer_opcao VARCHAR(50)[], -- Códigos de opções que devem estar selecionadas
    incompativel_com VARCHAR(50)[], -- Códigos incompatíveis
    -- Textos para proposta
    texto_proposta TEXT, -- Template com {{quantidade}}, {{valor}}, etc
    texto_caracteristicas TEXT, -- Para seção de características técnicas
    texto_orcamento TEXT, -- Para seção de orçamento
    -- Controle
    destaque BOOLEAN DEFAULT false, -- Destacar na UI
    ativo BOOLEAN DEFAULT true,
    vigencia_inicio DATE DEFAULT CURRENT_DATE,
    vigencia_fim DATE,
    ordem_exibicao INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de descontos x comissões
CREATE TABLE IF NOT EXISTS crm_precos_descontos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50),
    descricao TEXT,
    desconto_percentual DECIMAL(5,4) NOT NULL,
    fator_multiplicador DECIMAL(6,4) NOT NULL,
    comissao_percentual DECIMAL(5,4) NOT NULL,
    -- Controle de aprovação
    desconto_maximo_vendedor BOOLEAN DEFAULT true, -- Vendedor pode aplicar sem aprovação
    requer_aprovacao_gerente BOOLEAN DEFAULT false,
    requer_aprovacao_diretor BOOLEAN DEFAULT false,
    -- Controle
    ativo BOOLEAN DEFAULT true,
    ordem_exibicao INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(desconto_percentual)
);

-- Configurações gerais de preços
CREATE TABLE IF NOT EXISTS crm_precos_config (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20) DEFAULT 'STRING', -- STRING, NUMBER, BOOLEAN, JSON
    descricao TEXT,
    grupo VARCHAR(50), -- Agrupamento na UI
    editavel BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Regras condicionais dinâmicas
CREATE TABLE IF NOT EXISTS crm_precos_regras (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    -- Condição (quando aplicar)
    condicao_campo VARCHAR(50) NOT NULL, -- tamanho, tipo, regiao, segmento, etc
    condicao_operador VARCHAR(20) NOT NULL, -- IGUAL, DIFERENTE, MAIOR, MENOR, EM, NAO_EM, ENTRE
    condicao_valor TEXT NOT NULL, -- valor ou JSON array
    -- Ação (o que fazer)
    acao_tipo VARCHAR(30) NOT NULL, -- HABILITAR, DESABILITAR, OBRIGAR, OCULTAR, AJUSTAR_PRECO, DEFINIR_QUANTIDADE
    acao_alvo VARCHAR(50) NOT NULL, -- código da opção ou campo
    acao_valor TEXT, -- valor do ajuste se aplicável
    -- Mensagem
    mensagem_usuario TEXT, -- Mensagem para exibir ao usuário
    -- Controle
    prioridade INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Histórico de alterações de preços (auditoria)
CREATE TABLE IF NOT EXISTS crm_precos_historico (
    id SERIAL PRIMARY KEY,
    tabela VARCHAR(50) NOT NULL,
    registro_id INTEGER NOT NULL,
    acao VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    dados_anteriores JSONB,
    dados_novos JSONB,
    campos_alterados TEXT[], -- lista de campos que mudaram
    usuario_id INTEGER REFERENCES usuarios(id),
    usuario_nome VARCHAR(100),
    ip_address VARCHAR(45),
    motivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. TABELAS DE PROPOSTAS
-- =============================================

-- Sequência para número da proposta
CREATE SEQUENCE IF NOT EXISTS seq_numero_proposta START 1;

-- Propostas
CREATE TABLE IF NOT EXISTS crm_propostas (
    id SERIAL PRIMARY KEY,
    numero_proposta INTEGER UNIQUE NOT NULL DEFAULT nextval('seq_numero_proposta'),

    -- Relacionamentos
    vendedor_id INTEGER REFERENCES crm_vendedores(id),
    cliente_id INTEGER REFERENCES crm_clientes(id),
    oportunidade_id INTEGER REFERENCES crm_oportunidades(id),
    contato_id INTEGER REFERENCES crm_contatos(id),

    -- Status
    situacao VARCHAR(30) DEFAULT 'RASCUNHO',
    -- RASCUNHO, GERADA, ENVIADA, EM_NEGOCIACAO, APROVADA, REJEITADA, EXPIRADA, FECHADA, PERDIDA, CANCELADA, SUBSTITUIDA

    -- Datas
    data_proposta DATE DEFAULT CURRENT_DATE,
    data_visita DATE,
    validade_dias INTEGER DEFAULT 30,
    data_validade DATE,
    prazo_entrega_dias INTEGER,
    data_envio TIMESTAMP,
    data_aprovacao TIMESTAMP,
    data_rejeicao TIMESTAMP,

    -- Produto
    produto VARCHAR(20) NOT NULL, -- TOMBADOR, COLETOR

    -- Probabilidade/Chance
    chance_concretizacao INTEGER, -- 1-10

    -- ========== CONFIGURAÇÃO TOMBADOR ==========
    tombador_tamanho INTEGER, -- 11, 12, 18, 21, 26, 30
    tombador_tipo VARCHAR(10), -- FIXO, MOVEL
    tombador_complemento_titulo TEXT,
    tombador_comprimento_trilhos INTEGER,

    -- Opcionais selecionados (armazenados como JSON para flexibilidade)
    tombador_opcionais JSONB DEFAULT '[]',
    -- [{codigo: "ENCLAUSURAMENTO", quantidade: 4, preco_unit: 36000, preco_total: 144000}, ...]

    -- Especificações técnicas
    tombador_voltagem VARCHAR(10) DEFAULT '380',
    tombador_frequencia VARCHAR(10) DEFAULT '60',
    tombador_qt_mangueiras INTEGER DEFAULT 15,
    tombador_qt_cabos_eletricos INTEGER DEFAULT 15,
    tombador_botoeiras VARCHAR(50),
    tombador_qt_fio_botoeira INTEGER,

    -- Dados técnicos (preenchidos do preço base ou customizados)
    tombador_modelo VARCHAR(50),
    tombador_capacidade VARCHAR(50),
    tombador_qt_cilindros INTEGER,
    tombador_tipo_cilindros VARCHAR(20), -- INTERNO, EXTERNO
    tombador_qt_motores INTEGER,
    tombador_qt_oleo INTEGER,
    tombador_qt_trava_chassi INTEGER,
    tombador_qt_trava_roda INTEGER,
    tombador_angulo_inclinacao VARCHAR(20),
    tombador_aplicacao TEXT,

    -- Textos gerados para PDF
    tombador_outros_requisitos TEXT,
    tombador_observacoes TEXT,

    -- Valores calculados TOMBADOR
    tombador_preco_base DECIMAL(12,2),
    tombador_subtotal_opcionais DECIMAL(12,2),
    tombador_subtotal DECIMAL(12,2),
    tombador_quantidade INTEGER DEFAULT 1,
    tombador_preco_equipamento DECIMAL(12,2), -- preco_base * quantidade
    tombador_total_geral DECIMAL(12,2),
    tombador_forma_pagamento TEXT,

    -- ========== CONFIGURAÇÃO COLETOR ==========
    coletor_grau_rotacao INTEGER, -- 180, 270, 360
    coletor_tipo VARCHAR(20), -- ROTATIVO
    coletor_comprimento_trilhos INTEGER,

    -- Opcionais selecionados
    coletor_opcionais JSONB DEFAULT '[]',

    -- Especificações técnicas
    coletor_voltagem VARCHAR(10) DEFAULT '380',
    coletor_frequencia VARCHAR(10) DEFAULT '60',
    coletor_qt_motor INTEGER,
    coletor_marca_contactores VARCHAR(50),
    coletor_distancia_hidraulica INTEGER,
    coletor_distancia_ciclone INTEGER,
    coletor_tipo_escada VARCHAR(50),
    coletor_acionamento_comando VARCHAR(50),
    coletor_qt_fio_controle INTEGER,
    coletor_diametro_tubo VARCHAR(20),

    -- Dados técnicos
    coletor_modelo VARCHAR(50),

    -- Textos
    coletor_outros_requisitos TEXT,
    coletor_observacoes TEXT,

    -- Valores calculados COLETOR
    coletor_preco_base DECIMAL(12,2),
    coletor_subtotal_opcionais DECIMAL(12,2),
    coletor_subtotal DECIMAL(12,2),
    coletor_quantidade INTEGER DEFAULT 1,
    coletor_preco_equipamento DECIMAL(12,2),
    coletor_total_geral DECIMAL(12,2),
    coletor_forma_pagamento TEXT,

    -- ========== COMERCIAL ==========
    -- Desconto
    desconto_percentual DECIMAL(5,4) DEFAULT 0,
    desconto_valor DECIMAL(12,2) DEFAULT 0,
    desconto_aprovado_por INTEGER REFERENCES usuarios(id),
    desconto_aprovado_em TIMESTAMP,

    -- Comissão
    comissao_percentual DECIMAL(5,4),
    comissao_valor DECIMAL(12,2),

    -- Frete
    frete_tipo VARCHAR(10), -- CIF, FOB
    frete_valor DECIMAL(12,2) DEFAULT 0,

    -- Garantia
    garantia_meses INTEGER DEFAULT 12,

    -- Deslocamentos
    qt_deslocamentos INTEGER DEFAULT 2,
    valor_diaria DECIMAL(12,2) DEFAULT 2500,

    -- Total final
    valor_total DECIMAL(12,2),

    -- ========== LIBERAÇÃO COMERCIAL ==========
    liberacao_dados_cliente_ok BOOLEAN,
    liberacao_local_entrega_ok BOOLEAN,
    liberacao_prazo_ok BOOLEAN,
    liberacao_pagamento_ok BOOLEAN,
    liberacao_observacoes_ok BOOLEAN,
    liberacao_outros_requisitos_ok BOOLEAN,
    liberacao_todos_criterios_ok BOOLEAN,
    liberacao_acao_necessaria TEXT,
    liberacao_data TIMESTAMP,
    liberacao_usuario_id INTEGER REFERENCES usuarios(id),

    -- ========== FECHAMENTO ==========
    fechamento_data DATE,
    fechamento_concorrente VARCHAR(100),
    fechamento_motivo TEXT,
    fechamento_justificativa TEXT,

    -- ========== OPD ==========
    opd_numero INTEGER, -- Número da OPD gerada
    opd_criada_em TIMESTAMP,

    -- ========== ANEXOS ==========
    anexos JSONB DEFAULT '[]', -- [{url, nome, descricao, tipo}]

    -- Arquivo PDF gerado
    pdf_url TEXT,
    pdf_gerado_em TIMESTAMP,

    -- ========== IA ==========
    ia_sugestao_config JSONB, -- Configuração sugerida pela IA
    ia_sugestao_aceita BOOLEAN,
    ia_analise JSONB, -- Última análise da IA

    -- Metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(id),
    updated_by INTEGER REFERENCES usuarios(id)
);

-- Histórico de versões da proposta
CREATE TABLE IF NOT EXISTS crm_propostas_historico (
    id SERIAL PRIMARY KEY,
    proposta_id INTEGER REFERENCES crm_propostas(id),
    versao INTEGER NOT NULL,
    dados_snapshot JSONB NOT NULL,
    motivo_alteracao TEXT,
    alterado_por INTEGER REFERENCES usuarios(id),
    alterado_por_nome VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emails enviados da proposta
CREATE TABLE IF NOT EXISTS crm_propostas_emails (
    id SERIAL PRIMARY KEY,
    proposta_id INTEGER REFERENCES crm_propostas(id),
    para TEXT[] NOT NULL,
    cc TEXT[],
    assunto VARCHAR(200),
    corpo TEXT,
    anexos JSONB,
    status VARCHAR(20) DEFAULT 'ENVIADO', -- ENVIADO, ABERTO, CLICADO, ERRO
    erro_mensagem TEXT,
    enviado_por INTEGER REFERENCES usuarios(id),
    enviado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    aberto_em TIMESTAMP,
    clicado_em TIMESTAMP
);

-- =============================================
-- 4. TABELAS DE IA
-- =============================================

-- Análises da IA
CREATE TABLE IF NOT EXISTS crm_ia_analises (
    id SERIAL PRIMARY KEY,
    entidade_tipo VARCHAR(30) NOT NULL, -- CLIENTE, OPORTUNIDADE, PROPOSTA, CNPJ
    entidade_id INTEGER,
    cnpj VARCHAR(20), -- Para análises de CNPJ antes de criar cliente
    tipo_analise VARCHAR(50) NOT NULL, -- SCORE, PREVISAO, SUGESTAO_CONFIG, SUGESTAO_DESCONTO, OBJECAO
    entrada JSONB, -- Dados enviados para a IA
    resultado JSONB NOT NULL, -- Resultado da análise
    modelo_usado VARCHAR(50),
    tokens_entrada INTEGER,
    tokens_saida INTEGER,
    tempo_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sugestões da IA (para aprendizado)
CREATE TABLE IF NOT EXISTS crm_ia_sugestoes (
    id SERIAL PRIMARY KEY,
    proposta_id INTEGER REFERENCES crm_propostas(id),
    cliente_id INTEGER REFERENCES crm_clientes(id),
    tipo VARCHAR(50) NOT NULL, -- CONFIGURACAO, DESCONTO, FOLLOW_UP, EMAIL, ARGUMENTOS
    sugestao JSONB NOT NULL,
    aceita BOOLEAN, -- Vendedor aceitou a sugestão?
    feedback TEXT, -- Feedback do vendedor
    resultado_final VARCHAR(30), -- FECHOU, PERDEU, EM_ANDAMENTO
    valor_proposta DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    avaliada_em TIMESTAMP
);

-- Base de objeções e respostas
CREATE TABLE IF NOT EXISTS crm_ia_objecoes (
    id SERIAL PRIMARY KEY,
    categoria VARCHAR(50) NOT NULL, -- PRECO, PRAZO, CONCORRENCIA, TECNICO, FINANCEIRO, CONFIANCA
    objecao TEXT NOT NULL,
    palavras_chave TEXT[], -- Para matching
    respostas_sugeridas JSONB NOT NULL, -- Array de respostas
    argumentos_apoio JSONB, -- Dados/fatos para apoiar
    efetividade_media DECIMAL(5,2), -- % de sucesso quando usada
    vezes_usada INTEGER DEFAULT 0,
    vezes_sucesso INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates de comunicação
CREATE TABLE IF NOT EXISTS crm_ia_templates (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL, -- EMAIL, WHATSAPP, LIGACAO_SCRIPT
    momento VARCHAR(50) NOT NULL, -- PRIMEIRO_CONTATO, FOLLOW_UP, ENVIO_PROPOSTA, NEGOCIACAO, POS_VENDA
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    assunto VARCHAR(200), -- Para emails
    template TEXT NOT NULL,
    variaveis JSONB, -- [{nome: "cliente_nome", descricao: "Nome do cliente"}]
    ativo BOOLEAN DEFAULT true,
    vezes_usado INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. ÍNDICES
-- =============================================

-- Clientes
CREATE INDEX IF NOT EXISTS idx_crm_clientes_cpf_cnpj ON crm_clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_crm_clientes_vendedor ON crm_clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_crm_clientes_status ON crm_clientes(status);
CREATE INDEX IF NOT EXISTS idx_crm_clientes_regiao ON crm_clientes(regiao);
CREATE INDEX IF NOT EXISTS idx_crm_clientes_segmento ON crm_clientes(segmento);

-- Oportunidades
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_cliente ON crm_oportunidades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_vendedor ON crm_oportunidades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_estagio ON crm_oportunidades(estagio);
CREATE INDEX IF NOT EXISTS idx_crm_oportunidades_status ON crm_oportunidades(status);

-- Atividades
CREATE INDEX IF NOT EXISTS idx_crm_atividades_cliente ON crm_atividades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_atividades_vendedor ON crm_atividades(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_crm_atividades_data ON crm_atividades(data_agendada);
CREATE INDEX IF NOT EXISTS idx_crm_atividades_status ON crm_atividades(status);

-- Propostas
CREATE INDEX IF NOT EXISTS idx_crm_propostas_cliente ON crm_propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_propostas_vendedor ON crm_propostas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_crm_propostas_situacao ON crm_propostas(situacao);
CREATE INDEX IF NOT EXISTS idx_crm_propostas_produto ON crm_propostas(produto);
CREATE INDEX IF NOT EXISTS idx_crm_propostas_data ON crm_propostas(data_proposta);

-- Preços
CREATE INDEX IF NOT EXISTS idx_crm_precos_base_produto ON crm_precos_base(produto, ativo);
CREATE INDEX IF NOT EXISTS idx_crm_precos_opcoes_categoria ON crm_precos_opcoes(categoria_id, ativo);
CREATE INDEX IF NOT EXISTS idx_crm_precos_opcoes_produto ON crm_precos_opcoes(produto, ativo);
CREATE INDEX IF NOT EXISTS idx_crm_precos_opcoes_codigo ON crm_precos_opcoes(codigo);

-- Histórico
CREATE INDEX IF NOT EXISTS idx_crm_precos_historico_tabela ON crm_precos_historico(tabela, registro_id);
CREATE INDEX IF NOT EXISTS idx_crm_interacoes_cliente ON crm_interacoes(cliente_id);

-- IA
CREATE INDEX IF NOT EXISTS idx_crm_ia_analises_entidade ON crm_ia_analises(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_crm_ia_analises_cnpj ON crm_ia_analises(cnpj);

-- =============================================
-- 6. TRIGGERS
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
DROP TRIGGER IF EXISTS trg_crm_clientes_updated ON crm_clientes;
CREATE TRIGGER trg_crm_clientes_updated
    BEFORE UPDATE ON crm_clientes
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_crm_oportunidades_updated ON crm_oportunidades;
CREATE TRIGGER trg_crm_oportunidades_updated
    BEFORE UPDATE ON crm_oportunidades
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_crm_propostas_updated ON crm_propostas;
CREATE TRIGGER trg_crm_propostas_updated
    BEFORE UPDATE ON crm_propostas
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_crm_precos_base_updated ON crm_precos_base;
CREATE TRIGGER trg_crm_precos_base_updated
    BEFORE UPDATE ON crm_precos_base
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

DROP TRIGGER IF EXISTS trg_crm_precos_opcoes_updated ON crm_precos_opcoes;
CREATE TRIGGER trg_crm_precos_opcoes_updated
    BEFORE UPDATE ON crm_precos_opcoes
    FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- Função para auditoria de preços
CREATE OR REPLACE FUNCTION fn_precos_auditoria()
RETURNS TRIGGER AS $$
DECLARE
    campos_alterados TEXT[] := '{}';
    old_json JSONB;
    new_json JSONB;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        old_json := row_to_json(OLD)::JSONB;
        new_json := row_to_json(NEW)::JSONB;

        -- Identificar campos alterados
        SELECT array_agg(key) INTO campos_alterados
        FROM jsonb_each(old_json) o
        FULL OUTER JOIN jsonb_each(new_json) n USING (key)
        WHERE o.value IS DISTINCT FROM n.value
        AND key NOT IN ('updated_at');

        INSERT INTO crm_precos_historico (tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados)
        VALUES (TG_TABLE_NAME, OLD.id, 'UPDATE', old_json, new_json, campos_alterados);

        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO crm_precos_historico (tabela, registro_id, acao, dados_anteriores)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::JSONB);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO crm_precos_historico (tabela, registro_id, acao, dados_novos)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::JSONB);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers de auditoria para tabelas de preços
DROP TRIGGER IF EXISTS trg_precos_base_audit ON crm_precos_base;
CREATE TRIGGER trg_precos_base_audit
    AFTER INSERT OR UPDATE OR DELETE ON crm_precos_base
    FOR EACH ROW EXECUTE FUNCTION fn_precos_auditoria();

DROP TRIGGER IF EXISTS trg_precos_opcoes_audit ON crm_precos_opcoes;
CREATE TRIGGER trg_precos_opcoes_audit
    AFTER INSERT OR UPDATE OR DELETE ON crm_precos_opcoes
    FOR EACH ROW EXECUTE FUNCTION fn_precos_auditoria();

DROP TRIGGER IF EXISTS trg_precos_descontos_audit ON crm_precos_descontos;
CREATE TRIGGER trg_precos_descontos_audit
    AFTER INSERT OR UPDATE OR DELETE ON crm_precos_descontos
    FOR EACH ROW EXECUTE FUNCTION fn_precos_auditoria();

-- =============================================
-- 7. VIEWS
-- =============================================

-- View de pipeline com valores
CREATE OR REPLACE VIEW vw_crm_pipeline AS
SELECT
    o.estagio,
    COUNT(*) as quantidade,
    SUM(o.valor_estimado) as valor_total,
    AVG(o.probabilidade) as probabilidade_media,
    SUM(o.valor_estimado * o.probabilidade / 100) as valor_ponderado
FROM crm_oportunidades o
WHERE o.status = 'ABERTA'
GROUP BY o.estagio;

-- View de propostas com cliente e vendedor
CREATE OR REPLACE VIEW vw_crm_propostas AS
SELECT
    p.*,
    c.razao_social as cliente_razao_social,
    c.nome_fantasia as cliente_nome_fantasia,
    c.municipio as cliente_municipio,
    c.estado as cliente_estado,
    c.regiao as cliente_regiao,
    c.segmento as cliente_segmento,
    v.nome as vendedor_nome,
    v.email as vendedor_email
FROM crm_propostas p
LEFT JOIN crm_clientes c ON p.cliente_id = c.id
LEFT JOIN crm_vendedores v ON p.vendedor_id = v.id;

-- View de atividades pendentes
CREATE OR REPLACE VIEW vw_crm_atividades_pendentes AS
SELECT
    a.*,
    c.razao_social as cliente_razao_social,
    v.nome as vendedor_nome,
    CASE
        WHEN a.data_agendada < CURRENT_TIMESTAMP AND a.status = 'PENDENTE' THEN 'ATRASADA'
        ELSE a.status
    END as status_atual
FROM crm_atividades a
LEFT JOIN crm_clientes c ON a.cliente_id = c.id
LEFT JOIN crm_vendedores v ON a.vendedor_id = v.id
WHERE a.status IN ('PENDENTE', 'ATRASADA')
ORDER BY a.data_agendada;

-- View de preços ativos
CREATE OR REPLACE VIEW vw_crm_precos_ativos AS
SELECT
    pb.*,
    (SELECT json_agg(po.* ORDER BY po.ordem_exibicao)
     FROM crm_precos_opcoes po
     WHERE po.ativo = true
     AND (po.produto = pb.produto OR po.produto = 'AMBOS')
     AND (po.tamanhos_aplicaveis IS NULL OR pb.tamanho = ANY(po.tamanhos_aplicaveis))
     AND (po.tipos_aplicaveis IS NULL OR pb.tipo = ANY(po.tipos_aplicaveis))
     AND (po.vigencia_fim IS NULL OR po.vigencia_fim >= CURRENT_DATE)
    ) as opcoes_disponiveis
FROM crm_precos_base pb
WHERE pb.ativo = true
AND (pb.vigencia_fim IS NULL OR pb.vigencia_fim >= CURRENT_DATE)
ORDER BY pb.produto, pb.ordem_exibicao;

-- =============================================
-- FIM DO SCRIPT
-- =============================================
