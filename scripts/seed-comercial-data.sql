-- =============================================
-- SISTEMA COMERCIAL PILI - DADOS INICIAIS (SEED)
-- =============================================

-- =============================================
-- 1. CATEGORIAS DE OPCIONAIS
-- =============================================

INSERT INTO crm_precos_categorias (codigo, nome, descricao, produto, icone, cor, ordem_exibicao) VALUES
('CENTRAL_HIDRAULICA', 'Central Hidráulica', 'Opções de central hidráulica e cilindros', 'TOMBADOR', 'Cylinder', 'blue', 1),
('ESTRUTURAL', 'Acessórios Estruturais', 'Rampas, molduras, grelhas, calhas', 'TOMBADOR', 'Construction', 'orange', 2),
('SEGURANCA', 'Segurança', 'Travas, travamentos e itens de segurança', 'TOMBADOR', 'Shield', 'red', 3),
('COMPLEMENTAR', 'Acessórios Complementares', 'Enclausuramento, portões, calços', 'TOMBADOR', 'Package', 'green', 4),
('TECNOLOGIA', 'Painel e Tecnologia', 'Painéis elétricos, telemetria, automação', 'TOMBADOR', 'Cpu', 'purple', 5),
('LOGISTICA', 'Logística', 'Frete, guindaste, óleo', 'AMBOS', 'Truck', 'gray', 6),
('COLETOR_ESTRUTURA', 'Estrutura Coletor', 'Escada, platibanda, cadeira', 'COLETOR', 'Building', 'blue', 1),
('COLETOR_ACESSORIOS', 'Acessórios Coletor', 'Retorno de grão, tubo de coleta', 'COLETOR', 'Settings', 'green', 2)
ON CONFLICT (codigo) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    produto = EXCLUDED.produto;

-- =============================================
-- 2. PREÇOS BASE - TOMBADOR
-- =============================================

INSERT INTO crm_precos_base (produto, tamanho, tipo, preco, descricao, capacidade, modelo, qt_cilindros, qt_motores, qt_oleo, qt_trava_chassi, angulo_inclinacao, aplicacao, ordem_exibicao) VALUES
('TOMBADOR', 11, 'FIXO', 226000.00, 'Tombador 11 metros fixo', '40 toneladas', 'TB-11F', 2, 1, 200, 1, '45°', 'Caminhões toco e truck', 1),
('TOMBADOR', 12, 'FIXO', 229000.00, 'Tombador 12 metros fixo', '40 toneladas', 'TB-12F', 2, 1, 200, 1, '45°', 'Caminhões toco e truck', 2),
('TOMBADOR', 18, 'FIXO', 335600.00, 'Tombador 18 metros fixo', '80 toneladas', 'TB-18F', 2, 2, 400, 2, '45°', 'Caminhões truck e carretas', 3),
('TOMBADOR', 21, 'FIXO', 455000.00, 'Tombador 21 metros fixo', '80 toneladas', 'TB-21F', 2, 2, 500, 2, '45°', 'Carretas e bitrens', 4),
('TOMBADOR', 21, 'MOVEL', 649000.00, 'Tombador 21 metros móvel', '80 toneladas', 'TB-21M', 2, 2, 500, 2, '45°', 'Carretas e bitrens', 5),
('TOMBADOR', 26, 'FIXO', 789000.00, 'Tombador 26 metros fixo', '80 toneladas', 'TB-26F', 4, 2, 600, 2, '45°', 'Rodotrens e bitrens', 6),
('TOMBADOR', 26, 'MOVEL', 1084000.00, 'Tombador 26 metros móvel', '80 toneladas', 'TB-26M', 4, 2, 600, 2, '45°', 'Rodotrens e bitrens', 7),
('TOMBADOR', 30, 'FIXO', 986000.00, 'Tombador 30 metros fixo', '80 toneladas', 'TB-30F', 4, 2, 800, 2, '45°', 'Rodotrens de 30m', 8),
('TOMBADOR', 30, 'MOVEL', 1241000.00, 'Tombador 30 metros móvel', '80 toneladas', 'TB-30M', 4, 2, 800, 2, '45°', 'Rodotrens de 30m', 9)
ON CONFLICT DO NOTHING;

-- =============================================
-- 3. PREÇOS BASE - COLETOR
-- =============================================

INSERT INTO crm_precos_base (produto, tamanho, tipo, preco, descricao, capacidade, modelo, qt_motores, qt_oleo, ordem_exibicao) VALUES
('COLETOR', 180, 'ROTATIVO', 85000.00, 'Coletor de amostras 180°', 'Padrão', 'CL-180R', 1, 85, 1),
('COLETOR', 270, 'ROTATIVO', 95000.00, 'Coletor de amostras 270°', 'Padrão', 'CL-270R', 1, 85, 2),
('COLETOR', 360, 'ROTATIVO', 110000.00, 'Coletor de amostras 360°', 'Padrão', 'CL-360R', 1, 85, 3)
ON CONFLICT DO NOTHING;

-- =============================================
-- 4. OPCIONAIS - CENTRAL HIDRÁULICA
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, tamanhos_aplicaveis, incluso_no_base, permite_quantidade, grupo_exclusivo, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'CENTRAL_HIDRAULICA'),
 'CENTRAL_PADRAO', 'Central Hidráulica Padrão', 'Central hidráulica padrão inclusa no equipamento', 0.00, 'TOMBADOR', NULL, true, false, 'CENTRAL', 'Central hidráulica padrão.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'CENTRAL_HIDRAULICA'),
 'CENTRAL_REFORCADA_26', 'Central Hidráulica Reforçada 26m', 'Central hidráulica reforçada para maior desempenho', 116000.00, 'TOMBADOR', ARRAY[26], false, false, 'CENTRAL', 'Central hidráulica reforçada de alta performance.', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'CENTRAL_HIDRAULICA'),
 'CENTRAL_REFORCADA_30', 'Central Hidráulica Reforçada 30m', 'Central hidráulica reforçada para tombador 30m', 150000.00, 'TOMBADOR', ARRAY[30], false, false, 'CENTRAL', 'Central hidráulica reforçada de alta performance.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'CENTRAL_HIDRAULICA'),
 'CILINDRO_EXTERNO_26', 'Cilindro Externo 26m', 'Sistema com cilindros hidráulicos externos para 26m', 295000.00, 'TOMBADOR', ARRAY[26], false, false, 'CILINDRO', 'Sistema com cilindros hidráulicos externos.', 4),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'CENTRAL_HIDRAULICA'),
 'CILINDRO_EXTERNO_30', 'Cilindro Externo 30m', 'Sistema com cilindros hidráulicos externos para 30m', 255000.00, 'TOMBADOR', ARRAY[30], false, false, 'CILINDRO', 'Sistema com cilindros hidráulicos externos.', 5)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 5. OPCIONAIS - ESTRUTURAIS
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, tamanhos_aplicaveis, permite_quantidade, quantidade_padrao, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'MOLDURA_MOVEL_21', 'Moldura Móvel 21m', 'Moldura móvel para tombador de 21 metros', 194000.00, 'TOMBADOR', ARRAY[21], false, 1, 'Moldura móvel para versatilidade de operação.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'RAMPA_ACESSO', 'Rampa de Acesso', 'Rampa de acesso para veículos', 25000.00, 'TOMBADOR', NULL, true, 2, '{{quantidade}} rampa(s) de acesso.', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'RAMPA_SAIDA', 'Rampa de Saída', 'Rampa de saída para veículos', 22000.00, 'TOMBADOR', NULL, true, 1, '{{quantidade}} rampa(s) de saída.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'GRELHA_ASSOALHO', 'Grelha/Assoalho', 'Grelha ou assoalho adicional', 8500.00, 'TOMBADOR', NULL, true, 1, '{{quantidade}} grelha(s)/assoalho(s).', 4),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'CALHA_LATERAL', 'Calha Lateral', 'Calha lateral para escoamento', 6500.00, 'TOMBADOR', NULL, true, 2, '{{quantidade}} calha(s) lateral(is).', 5),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'VARANDA_LATERAL', 'Varanda Lateral', 'Varanda lateral de proteção', 12000.00, 'TOMBADOR', NULL, true, 2, '{{quantidade}} varanda(s) lateral(is).', 6),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'ESTRUTURAL'),
 'TRILHO_GUIA', 'Trilho Guia Adicional', 'Metro adicional de trilho guia', 850.00, 'TOMBADOR', NULL, true, 0, 'Trilhos guia adicionais: {{quantidade}} metros.', 7)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 6. OPCIONAIS - SEGURANÇA
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, tamanhos_aplicaveis, permite_quantidade, quantidade_padrao, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'SEGURANCA'),
 'TRAVA_PINO', 'Trava Pino', 'Sistema de trava pino para maior segurança', 165000.00, 'TOMBADOR', ARRAY[21, 26, 30], false, 1, 'Sistema de trava pino para segurança adicional.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'SEGURANCA'),
 'TRAVA_CHASSI_ADICIONAL', 'Trava Chassi Adicional', 'Trava chassi adicional', 18000.00, 'TOMBADOR', NULL, true, 1, '{{quantidade}} trava(s) chassi adicional(is).', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'SEGURANCA'),
 'TRAVAMENTO_AUXILIAR', 'Travamento Auxiliar', 'Sistema de travamento auxiliar', 22000.00, 'TOMBADOR', NULL, true, 1, '{{quantidade}} sistema(s) de travamento auxiliar.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'SEGURANCA'),
 'SENSOR_INCLINACAO', 'Sensor de Inclinação Extra', 'Sensor eletrônico de inclinação adicional', 3500.00, 'TOMBADOR', NULL, true, 1, 'Sensor de inclinação adicional.', 4)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 7. OPCIONAIS - COMPLEMENTARES
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, permite_quantidade, quantidade_padrao, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'ENCLAUSURAMENTO', 'Enclausuramento', 'Módulo de enclausuramento de segurança', 36000.00, 'TOMBADOR', true, 4, '{{quantidade}} módulo(s) de enclausuramento de segurança.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'PORTAO', 'Portão', 'Portão de acesso', 18000.00, 'TOMBADOR', true, 2, '{{quantidade}} portão(ões) de acesso.', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'PORTAO_AUTOMATICO', 'Portão Automático', 'Portão de acesso com automação', 32000.00, 'TOMBADOR', true, 2, '{{quantidade}} portão(ões) automático(s).', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'CALCO_MANUTENCAO', 'Calço de Manutenção', 'Calço de segurança para manutenção', 8500.00, 'TOMBADOR', true, 2, '{{quantidade}} calço(s) de manutenção.', 4),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'PEDESTAL', 'Pedestal', 'Pedestal de apoio', 15000.00, 'TOMBADOR', true, 1, '{{quantidade}} pedestal(is).', 5),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'ECONOMIZADOR_ENERGIA', 'Economizador de Energia', 'Sistema economizador de energia - reduz consumo em até 30%', 12000.00, 'TOMBADOR', true, 1, 'Economizador de energia - reduz consumo em até 30%.', 6),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'KIT_DESCIDA_RAPIDA', 'Kit Descida Rápida', 'Kit de descida rápida para emergências', 15000.00, 'TOMBADOR', true, 1, 'Kit de descida rápida para situações de emergência.', 7),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COMPLEMENTAR'),
 'KIT_DIALISE', 'Kit Diálise', 'Kit de diálise para filtragem do óleo hidráulico', 8500.00, 'TOMBADOR', true, 1, 'Kit de diálise para filtragem contínua do óleo.', 8)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 8. OPCIONAIS - TECNOLOGIA
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, permite_quantidade, grupo_exclusivo, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'PAINEL_PADRAO', 'Painel Elétrico Padrão', 'Painel elétrico padrão com botoeiras', 0.00, 'TOMBADOR', false, 'PAINEL', 'Painel elétrico padrão com botoeiras.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'PAINEL_CLP', 'Painel com CLP', 'Painel elétrico com CLP programável', 35000.00, 'TOMBADOR', false, 'PAINEL', 'Painel elétrico com CLP programável e IHM.', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'PAINEL_CLP_AVANCADO', 'Painel CLP Avançado', 'Painel com CLP avançado e supervisório', 55000.00, 'TOMBADOR', false, 'PAINEL', 'Painel elétrico com CLP avançado, IHM touchscreen e sistema supervisório.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'PILI_TECH', 'Pili Tech (Telemetria)', 'Sistema Pili Tech com telemetria e monitoramento remoto', 25000.00, 'TOMBADOR', false, NULL, 'Sistema Pili Tech com telemetria e monitoramento remoto via aplicativo.', 4),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'TELEMETRIA_AVANCADA', 'Telemetria Avançada', 'Sistema de telemetria avançada com dashboard e alertas', 45000.00, 'TOMBADOR', false, NULL, 'Sistema de telemetria avançada com dashboard online, alertas e relatórios.', 5),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'CONTROLE_REMOTO', 'Controle Remoto', 'Controle remoto sem fio', 8500.00, 'TOMBADOR', false, NULL, 'Controle remoto sem fio para operação à distância.', 6),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'TECNOLOGIA'),
 'BOTOEIRA_EXTRA', 'Botoeira Extra', 'Botoeira adicional com cabo', 3500.00, 'TOMBADOR', true, NULL, '{{quantidade}} botoeira(s) adicional(is).', 7)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 9. OPCIONAIS - LOGÍSTICA
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, preco_tipo, produto, permite_quantidade, grupo_exclusivo, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'LOGISTICA'),
 'FRETE_CIF', 'Frete CIF (Incluso)', 'Frete por conta do vendedor - incluso no valor', 0.00, 'FIXO', 'AMBOS', false, 'FRETE', 'Frete CIF - incluso no valor do equipamento.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'LOGISTICA'),
 'FRETE_FOB', 'Frete FOB (Cliente)', 'Frete por conta do comprador', 0.00, 'FIXO', 'AMBOS', false, 'FRETE', 'Frete FOB - por conta do cliente.', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'LOGISTICA'),
 'FRETE_VALOR', 'Frete (Valor Definido)', 'Frete com valor específico', 1.00, 'POR_UNIDADE', 'AMBOS', true, 'FRETE', 'Frete no valor de R$ {{valor_total}}.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'LOGISTICA'),
 'GUINDASTE', 'Guindaste', 'Diária de guindaste para descarga', 15000.00, 'POR_UNIDADE', 'AMBOS', true, NULL, '{{quantidade}} diária(s) de guindaste para descarga e montagem.', 4),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'LOGISTICA'),
 'OLEO_HLP68', 'Óleo HLP 68', 'Óleo hidráulico HLP 68 (por litro)', 25.00, 'POR_LITRO', 'AMBOS', true, NULL, '{{quantidade}} litros de óleo hidráulico HLP 68.', 5),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'LOGISTICA'),
 'MONTAGEM_EXTRA', 'Diária Montagem Extra', 'Diária extra de equipe de montagem', 2500.00, 'POR_UNIDADE', 'AMBOS', true, NULL, '{{quantidade}} diária(s) extra de montagem.', 6)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 10. OPCIONAIS - COLETOR ESTRUTURA
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, permite_quantidade, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ESTRUTURA'),
 'ESCADA_MARINHEIRO', 'Escada Marinheiro', 'Escada tipo marinheiro com guarda-corpo', 0.00, 'COLETOR', false, 'Escada de acesso tipo marinheiro com guarda-corpo.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ESTRUTURA'),
 'ESCADA_CARACOL', 'Escada Caracol', 'Escada tipo caracol', 8500.00, 'COLETOR', false, 'Escada de acesso tipo caracol.', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ESTRUTURA'),
 'PLATIBANDA', 'Platibanda', 'Platibanda de proteção', 12000.00, 'COLETOR', true, '{{quantidade}} platibanda(s) de proteção.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ESTRUTURA'),
 'CADEIRA_PLATIBANDA', 'Cadeira na Platibanda', 'Cadeira instalada na platibanda', 8500.00, 'COLETOR', true, '{{quantidade}} cadeira(s) na platibanda.', 4),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ESTRUTURA'),
 'CADEIRA_OPERADOR', 'Cadeira do Operador', 'Cadeira ergonômica para operador', 5500.00, 'COLETOR', true, '{{quantidade}} cadeira(s) para operador.', 5)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 11. OPCIONAIS - COLETOR ACESSÓRIOS
-- =============================================

INSERT INTO crm_precos_opcoes (categoria_id, codigo, nome, descricao, preco, produto, permite_quantidade, texto_proposta, ordem_exibicao) VALUES
((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ACESSORIOS'),
 'RETORNO_GRAO', 'Retorno de Grão', 'Sistema de retorno de grão para o caminhão', 15000.00, 'COLETOR', true, 'Sistema de retorno de grão para o caminhão.', 1),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ACESSORIOS'),
 'TUBO_COLETA_4POL', 'Tubo de Coleta 4"', 'Tubo de coleta de 4 polegadas adicional', 2500.00, 'COLETOR', true, '{{quantidade}} tubo(s) de coleta de 4".', 2),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ACESSORIOS'),
 'MONTAGEM_COLETOR', 'Montagem do Coletor', 'Serviço de montagem do coletor', 12000.00, 'COLETOR', false, 'Serviço de montagem e instalação do coletor.', 3),

((SELECT id FROM crm_precos_categorias WHERE codigo = 'COLETOR_ACESSORIOS'),
 'CICLONE_SEPARADOR', 'Ciclone Separador', 'Ciclone separador de partículas', 8500.00, 'COLETOR', true, '{{quantidade}} ciclone(s) separador(es).', 4)
ON CONFLICT (codigo) DO UPDATE SET
    preco = EXCLUDED.preco,
    nome = EXCLUDED.nome;

-- =============================================
-- 12. TABELA DE DESCONTOS
-- =============================================

INSERT INTO crm_precos_descontos (nome, descricao, desconto_percentual, fator_multiplicador, comissao_percentual, desconto_maximo_vendedor, requer_aprovacao_gerente, requer_aprovacao_diretor, ordem_exibicao) VALUES
('Preço Cheio', 'Sem desconto - comissão máxima', 0.000, 1.000, 0.080, true, false, false, 1),
('Desconto 3%', 'Desconto leve', 0.030, 0.970, 0.072, true, false, false, 2),
('Desconto 5,5%', 'Desconto padrão', 0.055, 0.945, 0.064, true, false, false, 3),
('Desconto 8%', 'Desconto comercial', 0.080, 0.920, 0.056, true, false, false, 4),
('Desconto 10,6%', 'Desconto promocional', 0.106, 0.894, 0.048, true, false, false, 5),
('Desconto 12%', 'Desconto especial', 0.120, 0.880, 0.040, false, true, false, 6),
('Desconto 15%', 'Desconto gerencial', 0.150, 0.850, 0.032, false, true, false, 7),
('Desconto 18%', 'Desconto diretoria', 0.180, 0.820, 0.024, false, false, true, 8),
('Desconto 20%', 'Desconto máximo', 0.200, 0.800, 0.020, false, false, true, 9)
ON CONFLICT (desconto_percentual) DO UPDATE SET
    nome = EXCLUDED.nome,
    fator_multiplicador = EXCLUDED.fator_multiplicador,
    comissao_percentual = EXCLUDED.comissao_percentual;

-- =============================================
-- 13. CONFIGURAÇÕES GERAIS
-- =============================================

INSERT INTO crm_precos_config (chave, valor, tipo, descricao, grupo) VALUES
('VALIDADE_PROPOSTA_DIAS', '30', 'NUMBER', 'Validade padrão da proposta em dias', 'PROPOSTA'),
('PRAZO_ENTREGA_MINIMO', '45', 'NUMBER', 'Prazo mínimo de entrega em dias', 'PROPOSTA'),
('PRAZO_ENTREGA_MAXIMO', '180', 'NUMBER', 'Prazo máximo de entrega em dias', 'PROPOSTA'),
('GARANTIA_PADRAO_MESES', '12', 'NUMBER', 'Garantia padrão em meses', 'PROPOSTA'),
('GARANTIA_MAXIMA_MESES', '24', 'NUMBER', 'Garantia máxima em meses', 'PROPOSTA'),
('DESLOCAMENTOS_PADRAO', '2', 'NUMBER', 'Número padrão de deslocamentos técnicos', 'MONTAGEM'),
('DESLOCAMENTOS_MAXIMO', '5', 'NUMBER', 'Número máximo de deslocamentos', 'MONTAGEM'),
('DIARIA_TECNICA', '2500.00', 'NUMBER', 'Valor da diária técnica em R$', 'MONTAGEM'),
('DIAS_MONTAGEM_PADRAO', '10', 'NUMBER', 'Dias padrão de montagem por equipamento', 'MONTAGEM'),
('MANGUEIRAS_PADRAO_METROS', '15', 'NUMBER', 'Metros padrão de mangueiras hidráulicas', 'TECNICO'),
('MANGUEIRAS_MAXIMO_METROS', '50', 'NUMBER', 'Metros máximo de mangueiras', 'TECNICO'),
('CABOS_PADRAO_METROS', '15', 'NUMBER', 'Metros padrão de cabos elétricos', 'TECNICO'),
('CABOS_MAXIMO_METROS', '50', 'NUMBER', 'Metros máximo de cabos', 'TECNICO'),
('MOEDA', 'BRL', 'STRING', 'Moeda padrão', 'GERAL'),
('EMPRESA_NOME', 'M. B. PILI Equipamentos Industriais Ltda.', 'STRING', 'Nome da empresa', 'EMPRESA'),
('EMPRESA_CNPJ', '05.620.512/0001-74', 'STRING', 'CNPJ da empresa', 'EMPRESA'),
('EMPRESA_ENDERECO', 'Rodovia BR 153 km 48 Nº674 - CEP 99700-000 - Erechim/RS', 'STRING', 'Endereço da empresa', 'EMPRESA'),
('EMPRESA_TELEFONE', '(54) 3522-2828', 'STRING', 'Telefone da empresa', 'EMPRESA'),
('EMPRESA_EMAIL', 'comercial@pili.ind.br', 'STRING', 'Email comercial', 'EMPRESA'),
('FINAME_TOMBADOR', '04231410', 'STRING', 'Código FINAME do Tombador', 'FISCAL'),
('FINAME_COLETOR', '3472369', 'STRING', 'Código FINAME do Coletor', 'FISCAL'),
('NCM_TOMBADOR', '8428.10.00', 'STRING', 'NCM do Tombador', 'FISCAL'),
('NCM_COLETOR', '8437.10.00', 'STRING', 'NCM do Coletor', 'FISCAL'),
('IPI_ALIQUOTA', '0', 'NUMBER', 'Alíquota de IPI (%)', 'FISCAL'),
('PIS_COFINS', '3.65', 'NUMBER', 'PIS/COFINS (%)', 'FISCAL'),
('ICMS_SUL', '17', 'NUMBER', 'ICMS para região Sul (%)', 'FISCAL'),
('ICMS_SUDESTE', '12', 'NUMBER', 'ICMS para região Sudeste (%)', 'FISCAL'),
('ICMS_OUTROS', '7', 'NUMBER', 'ICMS para outras regiões (%)', 'FISCAL')
ON CONFLICT (chave) DO UPDATE SET
    valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao;

-- =============================================
-- 14. REGRAS CONDICIONAIS
-- =============================================

INSERT INTO crm_precos_regras (nome, descricao, condicao_campo, condicao_operador, condicao_valor, acao_tipo, acao_alvo, acao_valor, mensagem_usuario, prioridade) VALUES
-- Cilindro externo só para 26m e 30m
('Cilindro externo 26m', 'Cilindro externo disponível apenas para 26m', 'tamanho', 'DIFERENTE', '26', 'DESABILITAR', 'CILINDRO_EXTERNO_26', NULL, NULL, 10),
('Cilindro externo 30m', 'Cilindro externo disponível apenas para 30m', 'tamanho', 'DIFERENTE', '30', 'DESABILITAR', 'CILINDRO_EXTERNO_30', NULL, NULL, 10),

-- Central reforçada por tamanho
('Central reforçada 26m', 'Central reforçada disponível apenas para 26m', 'tamanho', 'DIFERENTE', '26', 'DESABILITAR', 'CENTRAL_REFORCADA_26', NULL, NULL, 10),
('Central reforçada 30m', 'Central reforçada disponível apenas para 30m', 'tamanho', 'DIFERENTE', '30', 'DESABILITAR', 'CENTRAL_REFORCADA_30', NULL, NULL, 10),

-- Moldura móvel só 21m
('Moldura móvel 21m', 'Moldura móvel disponível apenas para 21m', 'tamanho', 'DIFERENTE', '21', 'DESABILITAR', 'MOLDURA_MOVEL_21', NULL, NULL, 10),

-- Trava pino recomendada para grandes
('Trava pino grandes', 'Trava pino recomendada para 21m, 26m e 30m', 'tamanho', 'NAO_EM', '[21, 26, 30]', 'DESABILITAR', 'TRAVA_PINO', NULL, NULL, 10),

-- Sugestões para grandes clientes
('Enclausuramento cooperativas', 'Sugerir enclausuramento para cooperativas', 'segmento', 'IGUAL', 'COOPERATIVA', 'HABILITAR', 'ENCLAUSURAMENTO', '4', 'Cooperativas geralmente precisam de enclausuramento completo.', 5),

-- Voltagem por região
('Voltagem 220V Norte', 'Sugerir 220V para região Norte', 'regiao', 'IGUAL', 'NORTE', 'DEFINIR_QUANTIDADE', 'voltagem', '220', 'Região Norte geralmente usa 220V.', 5)
ON CONFLICT DO NOTHING;

-- =============================================
-- 15. TEMPLATES DE EMAIL
-- =============================================

INSERT INTO crm_ia_templates (tipo, momento, nome, assunto, template, variaveis) VALUES
('EMAIL', 'PRIMEIRO_CONTATO', 'Primeiro Contato', 'PILI - Apresentação de Soluções para {{cliente_nome}}',
'Prezado(a) {{contato_nome}},

Meu nome é {{vendedor_nome}} e represento a PILI Equipamentos Industriais, referência nacional em sistemas de descarga tipo tombador e coletores de amostras de grãos.

Identificamos que a {{cliente_nome}} pode se beneficiar das nossas soluções para otimizar o recebimento de grãos.

Nossos principais produtos:
- Tombadores de 11m a 30m (fixos e móveis)
- Coletores de amostras (180°, 270° e 360°)

Gostaria de agendar uma conversa para entender melhor suas necessidades e apresentar como podemos ajudar.

Posso ligar {{data_sugerida}}?

Atenciosamente,
{{vendedor_nome}}
{{vendedor_telefone}}
PILI Equipamentos Industriais',
'[{"nome": "cliente_nome", "descricao": "Nome do cliente"}, {"nome": "contato_nome", "descricao": "Nome do contato"}, {"nome": "vendedor_nome", "descricao": "Nome do vendedor"}, {"nome": "vendedor_telefone", "descricao": "Telefone do vendedor"}, {"nome": "data_sugerida", "descricao": "Data sugerida para contato"}]'),

('EMAIL', 'ENVIO_PROPOSTA', 'Envio de Proposta', 'PILI - Proposta Comercial #{{numero_proposta}} - {{produto}} {{tamanho}}m',
'Prezado(a) {{contato_nome}},

Conforme conversamos, segue em anexo nossa proposta comercial para fornecimento de:

**{{produto}} {{tamanho}}m {{tipo}}**
**Valor: {{valor_total}}**
**Validade: {{validade}} dias**

Principais características:
- Capacidade: {{capacidade}}
- Garantia: {{garantia}} meses
- Prazo de entrega: {{prazo_entrega}} dias

Estou à disposição para esclarecer qualquer dúvida e negociar as condições comerciais.

Atenciosamente,
{{vendedor_nome}}
{{vendedor_telefone}}
PILI Equipamentos Industriais',
'[{"nome": "contato_nome", "descricao": "Nome do contato"}, {"nome": "numero_proposta", "descricao": "Número da proposta"}, {"nome": "produto", "descricao": "Tipo do produto"}, {"nome": "tamanho", "descricao": "Tamanho em metros"}, {"nome": "tipo", "descricao": "Tipo (Fixo/Móvel)"}, {"nome": "valor_total", "descricao": "Valor total formatado"}, {"nome": "validade", "descricao": "Dias de validade"}, {"nome": "capacidade", "descricao": "Capacidade"}, {"nome": "garantia", "descricao": "Meses de garantia"}, {"nome": "prazo_entrega", "descricao": "Prazo de entrega"}, {"nome": "vendedor_nome", "descricao": "Nome do vendedor"}, {"nome": "vendedor_telefone", "descricao": "Telefone do vendedor"}]'),

('EMAIL', 'FOLLOW_UP', 'Follow-up', 'PILI - Proposta #{{numero_proposta}} - Alguma dúvida?',
'Prezado(a) {{contato_nome}},

Gostaria de verificar se teve a oportunidade de analisar nossa proposta #{{numero_proposta}} enviada em {{data_envio}}.

Fico à disposição para:
- Esclarecer dúvidas técnicas
- Negociar condições comerciais
- Agendar uma visita técnica

Posso ligar para conversarmos?

Atenciosamente,
{{vendedor_nome}}
{{vendedor_telefone}}',
'[{"nome": "contato_nome", "descricao": "Nome do contato"}, {"nome": "numero_proposta", "descricao": "Número da proposta"}, {"nome": "data_envio", "descricao": "Data de envio"}, {"nome": "vendedor_nome", "descricao": "Nome do vendedor"}, {"nome": "vendedor_telefone", "descricao": "Telefone do vendedor"}]'),

('WHATSAPP', 'PRIMEIRO_CONTATO', 'WhatsApp Primeiro Contato', NULL,
'Olá {{contato_nome}}! 👋

Sou {{vendedor_nome}} da *PILI Equipamentos*.

Somos fabricantes de tombadores e coletores de grãos. Identifiquei que a {{cliente_nome}} pode se beneficiar das nossas soluções.

Posso enviar mais informações?',
'[{"nome": "contato_nome", "descricao": "Nome do contato"}, {"nome": "vendedor_nome", "descricao": "Nome do vendedor"}, {"nome": "cliente_nome", "descricao": "Nome do cliente"}]'),

('WHATSAPP', 'FOLLOW_UP', 'WhatsApp Follow-up', NULL,
'Olá {{contato_nome}}!

Passando para saber se conseguiu analisar nossa proposta do {{produto}} {{tamanho}}m.

Tem alguma dúvida? Posso ajudar com algo?',
'[{"nome": "contato_nome", "descricao": "Nome do contato"}, {"nome": "produto", "descricao": "Tipo do produto"}, {"nome": "tamanho", "descricao": "Tamanho"}]')
ON CONFLICT DO NOTHING;

-- =============================================
-- 16. BASE DE OBJEÇÕES
-- =============================================

INSERT INTO crm_ia_objecoes (categoria, objecao, palavras_chave, respostas_sugeridas, argumentos_apoio) VALUES
('PRECO', 'O preço está muito alto', ARRAY['caro', 'alto', 'preço', 'valor', 'custo'],
'["Entendo sua preocupação com o investimento. Vamos analisar o retorno? Nossos equipamentos têm vida útil de 20+ anos e custo de manutenção muito baixo.", "Posso detalhar o que está incluso no valor: instalação, treinamento, garantia e suporte técnico. Comparando item a item, nosso preço é competitivo.", "Temos condições especiais de pagamento via FINAME com taxas atrativas. Posso simular para você?"]',
'{"vida_util": "20+ anos", "garantia": "12 meses", "suporte": "Técnicos próprios em todo Brasil", "financiamento": "FINAME disponível"}'),

('PRECO', 'O concorrente está mais barato', ARRAY['concorrente', 'barato', 'menor preço', 'outra empresa'],
'["Qual empresa e modelo está comparando? Assim posso mostrar as diferenças técnicas.", "É importante comparar especificações equivalentes. Nossos cilindros, por exemplo, são superdimensionados para maior durabilidade.", "Além do preço, considere: tempo de entrega, qualidade da instalação e suporte pós-venda. Temos casos de clientes que trocaram equipamentos concorrentes por problemas."]',
'{"diferenciais": ["Cilindros superdimensionados", "Pintura PU WEG", "Suporte técnico próprio", "Peças em estoque"]}'),

('PRAZO', 'O prazo de entrega está muito longo', ARRAY['prazo', 'demora', 'urgente', 'rápido', 'entrega'],
'["Nosso prazo contempla fabricação com qualidade e testes rigorosos. Equipamentos apressados podem dar problemas.", "Vou verificar nossa fila de produção. Em alguns casos conseguimos priorizar.", "Podemos alinhar a entrega com o cronograma da sua obra civil. Quando estaria pronta a fundação?"]',
'{"motivo_prazo": "Fabricação própria com controle de qualidade", "flexibilidade": "Negociável conforme fila"}'),

('TECNICO', 'Não conheço a marca PILI', ARRAY['não conheço', 'nunca ouvi', 'marca', 'referência'],
'["A PILI está no mercado há mais de 25 anos e já instalamos mais de 2.000 equipamentos em todo Brasil.", "Posso enviar lista de clientes na sua região para você consultar referências.", "Temos certificação ISO 9001 e nossos equipamentos são registrados no FINAME, o que comprova a qualidade."]',
'{"anos_mercado": 25, "equipamentos_instalados": 2000, "certificacoes": ["ISO 9001", "FINAME"]}'),

('FINANCEIRO', 'Não tenho orçamento agora', ARRAY['orçamento', 'dinheiro', 'verba', 'investir', 'momento'],
'["Entendo. Podemos deixar a proposta pronta para quando tiver orçamento. Qual a previsão?", "Temos financiamento FINAME com carência e taxas atrativas. Posso simular sem compromisso?", "Alguns clientes iniciam com equipamentos menores e ampliam depois. Podemos ver opções?"]',
'{"financiamento": "FINAME disponível", "carencia": "Até 12 meses", "parcelamento": "Até 60x"}'),

('CONFIANCA', 'Preciso pensar melhor', ARRAY['pensar', 'analisar', 'avaliar', 'decidir', 'ver'],
'["Claro, é uma decisão importante. Posso ajudar com alguma informação adicional para sua análise?", "Que tal agendarmos uma visita à nossa fábrica ou a um cliente próximo para você conhecer o equipamento funcionando?", "Quais pontos específicos você gostaria de analisar melhor? Posso preparar material."]',
'{"visita_fabrica": "Disponível", "visita_cliente": "Podemos agendar"}')
ON CONFLICT DO NOTHING;

-- =============================================
-- FIM DO SEED
-- =============================================
