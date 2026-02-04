-- =====================================================
-- SISTEMA DE PERMISSÕES DE USUÁRIOS - PORTAL PILI
-- Gestão de acesso por módulo e restrições de edição
-- =====================================================

-- Tabela de módulos do sistema
CREATE TABLE IF NOT EXISTS modulos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de permissões por módulo
CREATE TABLE IF NOT EXISTS permissoes_modulos (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id INT NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
  pode_visualizar BOOLEAN DEFAULT true,
  pode_criar BOOLEAN DEFAULT false,
  pode_editar BOOLEAN DEFAULT false,
  pode_excluir BOOLEAN DEFAULT false,
  pode_aprovar BOOLEAN DEFAULT false,
  restricoes JSONB DEFAULT '{}', -- Restrições específicas
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, modulo_id)
);

-- Tabela de perfis de acesso (templates de permissões)
CREATE TABLE IF NOT EXISTS perfis_acesso (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT,
  permissoes_padrao JSONB NOT NULL, -- { modulo_codigo: { visualizar, criar, editar, excluir, aprovar } }
  nivel INT DEFAULT 0, -- Nível hierárquico (0=básico, 10=admin)
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Associação usuário-perfil
CREATE TABLE IF NOT EXISTS usuarios_perfis (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  perfil_id INT NOT NULL REFERENCES perfis_acesso(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, perfil_id)
);

-- Log de atividades do usuário
CREATE TABLE IF NOT EXISTS log_atividades (
  id SERIAL PRIMARY KEY,
  usuario_id INT REFERENCES usuarios(id),
  acao VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, CRIAR, EDITAR, EXCLUIR, VISUALIZAR
  modulo VARCHAR(50),
  registro_tipo VARCHAR(100),
  registro_id VARCHAR(100),
  dados_anteriores JSONB,
  dados_novos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Adicionar campos de permissão na tabela usuarios se não existirem
DO $$
BEGIN
  -- Campo para perfil principal
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'perfil_id') THEN
    ALTER TABLE usuarios ADD COLUMN perfil_id INT REFERENCES perfis_acesso(id);
  END IF;

  -- Campo para administrador do sistema
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'is_admin') THEN
    ALTER TABLE usuarios ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;

  -- Campo para último acesso
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'ultimo_acesso') THEN
    ALTER TABLE usuarios ADD COLUMN ultimo_acesso TIMESTAMP;
  END IF;

  -- Campo para avatar
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'avatar_url') THEN
    ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(500);
  END IF;
END $$;

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir módulos do sistema
INSERT INTO modulos (codigo, nome, descricao, icone, ordem) VALUES
  ('PRODUCAO', 'Produção', 'Gestão de OPDs e atividades de produção', 'factory', 1),
  ('QUALIDADE', 'Qualidade', 'Não conformidades, reclamações e ações corretivas', 'check-circle', 2),
  ('COMERCIAL', 'Comercial', 'CRM, propostas e gestão de vendas', 'briefcase', 3),
  ('ADMIN', 'Administração', 'Gestão de usuários e configurações do sistema', 'settings', 99)
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  icone = EXCLUDED.icone,
  ordem = EXCLUDED.ordem;

-- Inserir perfis de acesso padrão
INSERT INTO perfis_acesso (nome, descricao, permissoes_padrao, nivel) VALUES
  (
    'Administrador',
    'Acesso total ao sistema',
    '{
      "PRODUCAO": {"visualizar": true, "criar": true, "editar": true, "excluir": true, "aprovar": true},
      "QUALIDADE": {"visualizar": true, "criar": true, "editar": true, "excluir": true, "aprovar": true},
      "COMERCIAL": {"visualizar": true, "criar": true, "editar": true, "excluir": true, "aprovar": true},
      "ADMIN": {"visualizar": true, "criar": true, "editar": true, "excluir": true, "aprovar": true}
    }',
    10
  ),
  (
    'Gerente',
    'Acesso completo aos módulos operacionais',
    '{
      "PRODUCAO": {"visualizar": true, "criar": true, "editar": true, "excluir": false, "aprovar": true},
      "QUALIDADE": {"visualizar": true, "criar": true, "editar": true, "excluir": false, "aprovar": true},
      "COMERCIAL": {"visualizar": true, "criar": true, "editar": true, "excluir": false, "aprovar": true},
      "ADMIN": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false}
    }',
    5
  ),
  (
    'Vendedor',
    'Acesso ao módulo comercial',
    '{
      "PRODUCAO": {"visualizar": true, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "QUALIDADE": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "COMERCIAL": {"visualizar": true, "criar": true, "editar": true, "excluir": false, "aprovar": false},
      "ADMIN": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false}
    }',
    2
  ),
  (
    'Operador Produção',
    'Acesso ao módulo de produção',
    '{
      "PRODUCAO": {"visualizar": true, "criar": true, "editar": true, "excluir": false, "aprovar": false},
      "QUALIDADE": {"visualizar": true, "criar": true, "editar": false, "excluir": false, "aprovar": false},
      "COMERCIAL": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "ADMIN": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false}
    }',
    1
  ),
  (
    'Qualidade',
    'Acesso ao módulo de qualidade',
    '{
      "PRODUCAO": {"visualizar": true, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "QUALIDADE": {"visualizar": true, "criar": true, "editar": true, "excluir": false, "aprovar": true},
      "COMERCIAL": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "ADMIN": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false}
    }',
    2
  ),
  (
    'Visualizador',
    'Acesso somente leitura',
    '{
      "PRODUCAO": {"visualizar": true, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "QUALIDADE": {"visualizar": true, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "COMERCIAL": {"visualizar": true, "criar": false, "editar": false, "excluir": false, "aprovar": false},
      "ADMIN": {"visualizar": false, "criar": false, "editar": false, "excluir": false, "aprovar": false}
    }',
    0
  )
ON CONFLICT (nome) DO UPDATE SET
  descricao = EXCLUDED.descricao,
  permissoes_padrao = EXCLUDED.permissoes_padrao,
  nivel = EXCLUDED.nivel;

-- Índices
CREATE INDEX IF NOT EXISTS idx_permissoes_modulos_usuario ON permissoes_modulos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulos_modulo ON permissoes_modulos(modulo_id);
CREATE INDEX IF NOT EXISTS idx_log_atividades_usuario ON log_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_log_atividades_data ON log_atividades(created_at);
CREATE INDEX IF NOT EXISTS idx_log_atividades_modulo ON log_atividades(modulo);

-- Adicionar campos cargo e departamento se não existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'cargo') THEN
    ALTER TABLE usuarios ADD COLUMN cargo VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'departamento') THEN
    ALTER TABLE usuarios ADD COLUMN departamento VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'ativo') THEN
    -- Se não existe ativo mas existe active, criar uma view ou adicionar ativo
    ALTER TABLE usuarios ADD COLUMN ativo BOOLEAN DEFAULT true;
    -- Sincroniza com active se existir
    UPDATE usuarios SET ativo = active WHERE ativo IS NULL;
  END IF;
END $$;

-- View para verificar permissões do usuário
CREATE OR REPLACE VIEW vw_permissoes_usuario AS
SELECT
  u.id as usuario_id,
  u.nome as usuario_nome,
  u.email,
  u.cargo,
  u.departamento,
  u.is_admin,
  m.codigo as modulo_codigo,
  m.nome as modulo_nome,
  COALESCE(pm.pode_visualizar,
    (p.permissoes_padrao->m.codigo->>'visualizar')::boolean,
    false) as pode_visualizar,
  COALESCE(pm.pode_criar,
    (p.permissoes_padrao->m.codigo->>'criar')::boolean,
    false) as pode_criar,
  COALESCE(pm.pode_editar,
    (p.permissoes_padrao->m.codigo->>'editar')::boolean,
    false) as pode_editar,
  COALESCE(pm.pode_excluir,
    (p.permissoes_padrao->m.codigo->>'excluir')::boolean,
    false) as pode_excluir,
  COALESCE(pm.pode_aprovar,
    (p.permissoes_padrao->m.codigo->>'aprovar')::boolean,
    false) as pode_aprovar
FROM usuarios u
CROSS JOIN modulos m
LEFT JOIN perfis_acesso p ON u.perfil_id = p.id
LEFT JOIN permissoes_modulos pm ON u.id = pm.usuario_id AND m.id = pm.modulo_id
WHERE COALESCE(u.ativo, u.active, true) = true AND m.ativo = true;

-- Função para verificar permissão
CREATE OR REPLACE FUNCTION verificar_permissao(
  p_usuario_id INT,
  p_modulo_codigo VARCHAR,
  p_acao VARCHAR -- 'visualizar', 'criar', 'editar', 'excluir', 'aprovar'
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_tem_permissao BOOLEAN;
BEGIN
  -- Verifica se é admin
  SELECT is_admin INTO v_is_admin FROM usuarios WHERE id = p_usuario_id;
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Verifica permissão específica
  EXECUTE format(
    'SELECT pode_%s FROM vw_permissoes_usuario WHERE usuario_id = $1 AND modulo_codigo = $2',
    p_acao
  ) INTO v_tem_permissao USING p_usuario_id, p_modulo_codigo;

  RETURN COALESCE(v_tem_permissao, false);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_modulos_updated ON modulos;
CREATE TRIGGER trigger_modulos_updated BEFORE UPDATE ON modulos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_permissoes_modulos_updated ON permissoes_modulos;
CREATE TRIGGER trigger_permissoes_modulos_updated BEFORE UPDATE ON permissoes_modulos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_perfis_acesso_updated ON perfis_acesso;
CREATE TRIGGER trigger_perfis_acesso_updated BEFORE UPDATE ON perfis_acesso
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
