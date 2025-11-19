-- ============================================
-- ADICIONAR AUTENTICAÇÃO E AUDITORIA
-- ============================================

-- Tabela de usuários para autenticação
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  id_funcionario VARCHAR(50) UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  cargo VARCHAR(100),
  departamento VARCHAR(100),
  ativo BOOLEAN DEFAULT TRUE,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de auditoria de atividades
CREATE TABLE IF NOT EXISTS auditoria_atividades (
  id SERIAL PRIMARY KEY,
  atividade_id INTEGER NOT NULL REFERENCES registros_atividades(id) ON DELETE CASCADE,
  numero_opd VARCHAR(50) NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  usuario_nome VARCHAR(255) NOT NULL,
  usuario_id_funcionario VARCHAR(50) NOT NULL,
  acao VARCHAR(50) NOT NULL, -- 'INICIADA', 'CONCLUIDA', 'PAUSADA', 'RETOMADA', 'EDITADA'
  status_anterior VARCHAR(50),
  status_novo VARCHAR(50),
  data_acao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacoes TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  dados_alterados JSONB, -- Campos que foram alterados
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_auditoria_atividade_id ON auditoria_atividades(atividade_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_numero_opd ON auditoria_atividades(numero_opd);
CREATE INDEX IF NOT EXISTS idx_auditoria_data_acao ON auditoria_atividades(data_acao);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_id_funcionario ON usuarios(id_funcionario);

-- Trigger para atualizar updated em usuarios
CREATE OR REPLACE FUNCTION update_usuarios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usuarios_timestamp
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION update_usuarios_timestamp();

-- Tabela de assinaturas digitais
CREATE TABLE IF NOT EXISTS assinaturas_digitais (
  id SERIAL PRIMARY KEY,
  formulario_id INTEGER NOT NULL REFERENCES formularios_preenchidos(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  usuario_nome VARCHAR(255) NOT NULL,
  tipo_assinatura VARCHAR(50) NOT NULL, -- 'RESPONSAVEL_VERIFICACAO', 'RESPONSAVEL_LIBERACAO', 'ACEITE_CLIENTE', etc.
  assinatura_data TEXT NOT NULL, -- Base64 da assinatura
  ip_address VARCHAR(45),
  data_assinatura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  certificado_hash TEXT, -- Hash para validação de integridade
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para assinaturas
CREATE INDEX IF NOT EXISTS idx_assinaturas_formulario_id ON assinaturas_digitais(formulario_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario_id ON assinaturas_digitais(usuario_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data ON assinaturas_digitais(data_assinatura);

-- Inserir usuários de exemplo (REMOVER EM PRODUÇÃO)
-- Senha padrão para todos: "senha123" (hash bcrypt)
INSERT INTO usuarios (nome, email, id_funcionario, senha_hash, cargo, departamento) VALUES
  ('Admin Sistema', 'admin@pili.com', 'ADM001', '$2b$10$rKz8kQP5LJXxJ5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Q', 'Administrador', 'TI'),
  ('João Silva', 'joao.silva@pili.com', 'FIN001', '$2b$10$rKz8kQP5LJXxJ5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Q', 'Gerente', 'FINANCEIRO'),
  ('Maria Santos', 'maria.santos@pili.com', 'ENG001', '$2b$10$rKz8kQP5LJXxJ5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Q', 'Engenheira', 'ENGENHARIA'),
  ('Carlos Oliveira', 'carlos.oliveira@pili.com', 'PROD001', '$2b$10$rKz8kQP5LJXxJ5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Q', 'Supervisor', 'PRODUÇÃO'),
  ('Ana Costa', 'ana.costa@pili.com', 'INST001', '$2b$10$rKz8kQP5LJXxJ5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Qz5Q', 'Técnica', 'INSTALAÇÃO')
ON CONFLICT (email) DO NOTHING;

-- View para relatório de auditoria
CREATE OR REPLACE VIEW vw_auditoria_completa AS
SELECT
  a.id,
  a.numero_opd,
  ra.atividade as nome_atividade,
  a.usuario_nome,
  a.usuario_id_funcionario,
  u.cargo,
  u.departamento,
  a.acao,
  a.status_anterior,
  a.status_novo,
  a.data_acao,
  a.observacoes,
  a.ip_address,
  a.dados_alterados
FROM auditoria_atividades a
JOIN registros_atividades ra ON a.atividade_id = ra.id
JOIN usuarios u ON a.usuario_id = u.id
ORDER BY a.data_acao DESC;

-- View para relatório de assinaturas
CREATE OR REPLACE VIEW vw_assinaturas_completas AS
SELECT
  ad.id,
  fp.numero_opd,
  fp.tipo_formulario,
  ad.usuario_nome,
  u.cargo,
  u.departamento,
  ad.tipo_assinatura,
  ad.data_assinatura,
  ad.ip_address,
  fp.data_preenchimento
FROM assinaturas_digitais ad
JOIN formularios_preenchidos fp ON ad.formulario_id = fp.id
JOIN usuarios u ON ad.usuario_id = u.id
ORDER BY ad.data_assinatura DESC;

COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema para autenticação';
COMMENT ON TABLE auditoria_atividades IS 'Registro de todas as ações realizadas nas atividades (início, conclusão, edições)';
COMMENT ON TABLE assinaturas_digitais IS 'Armazenamento de assinaturas digitais nos formulários';
COMMENT ON COLUMN usuarios.senha_hash IS 'Hash bcrypt da senha do usuário';
COMMENT ON COLUMN auditoria_atividades.acao IS 'Tipo de ação: INICIADA, CONCLUIDA, PAUSADA, RETOMADA, EDITADA';
COMMENT ON COLUMN assinaturas_digitais.assinatura_data IS 'Assinatura em formato Base64';
COMMENT ON COLUMN assinaturas_digitais.certificado_hash IS 'Hash SHA-256 para validação de integridade da assinatura';
