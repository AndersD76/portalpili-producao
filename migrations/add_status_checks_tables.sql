-- Status Check via WhatsApp - Tabelas para solicitação de atualização de status

CREATE TABLE IF NOT EXISTS crm_status_checks (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) UNIQUE NOT NULL,
  vendedor_id INTEGER NOT NULL REFERENCES crm_vendedores(id),
  criado_por INTEGER NOT NULL REFERENCES usuarios(id),
  status VARCHAR(20) DEFAULT 'PENDENTE',
  mensagem_whatsapp_id VARCHAR(100),
  total_oportunidades INTEGER NOT NULL,
  total_respondidas INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  respondido_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_status_checks_token ON crm_status_checks(token);
CREATE INDEX IF NOT EXISTS idx_crm_status_checks_vendedor ON crm_status_checks(vendedor_id);

CREATE TABLE IF NOT EXISTS crm_status_check_items (
  id SERIAL PRIMARY KEY,
  status_check_id INTEGER NOT NULL REFERENCES crm_status_checks(id) ON DELETE CASCADE,
  oportunidade_id INTEGER NOT NULL REFERENCES crm_oportunidades(id),
  estagio_anterior VARCHAR(30) NOT NULL,
  estagio_novo VARCHAR(30),
  observacao TEXT,
  respondido_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_status_check_items_check ON crm_status_check_items(status_check_id);
