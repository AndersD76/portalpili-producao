-- =============================================
-- Módulo Serviços - Gestão de Despesas de Campo
-- =============================================

-- Técnicos de campo
CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  user_id INT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Veículos da frota
CREATE TABLE IF NOT EXISTS fleet_vehicles (
  id SERIAL PRIMARY KEY,
  plate VARCHAR(20) NOT NULL UNIQUE,
  model VARCHAR(60) NOT NULL,
  description VARCHAR(100),
  active BOOLEAN DEFAULT true
);

-- Códigos de autorização prévia (Peças e Outros)
CREATE TABLE IF NOT EXISTS expense_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) NOT NULL UNIQUE,
  requester_name VARCHAR(100) NOT NULL,
  requester_phone VARCHAR(20),
  requester_email VARCHAR(100),
  reason TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  manager_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'Pendente',
  decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Despesas de campo
CREATE TABLE IF NOT EXISTS field_expenses (
  id SERIAL PRIMARY KEY,

  -- Captura
  receipt_image_path TEXT,
  receipt_image_url TEXT,
  ai_raw_response JSONB,
  ai_confidence JSONB,

  -- Dados básicos
  technician_name VARCHAR(100) NOT NULL,
  client_name VARCHAR(150),
  client_name_normalized VARCHAR(150),
  location VARCHAR(100),
  location_normalized VARCHAR(100),
  category VARCHAR(30) NOT NULL,
  expense_date DATE,

  -- Veículo (Combustível)
  vehicle_id INT REFERENCES fleet_vehicles(id),
  vehicle_km INT,
  fuel_liters NUMERIC(8,3),
  fuel_type VARCHAR(30),

  -- Tipo de serviço
  service_type VARCHAR(30),
  service_type_custom VARCHAR(100),

  -- Autorização (Peças e Outros)
  auth_code VARCHAR(8),
  item_description TEXT,

  -- Valores e pagamento
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(30),

  -- Documentos
  osv_number VARCHAR(30),
  nf_number VARCHAR(30),

  -- Controle
  status VARCHAR(20) DEFAULT 'pendente',
  validated_by VARCHAR(100),
  validated_at TIMESTAMPTZ,
  notes TEXT,

  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_expenses_tech ON field_expenses(technician_name);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON field_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_osv ON field_expenses(osv_number);
CREATE INDEX IF NOT EXISTS idx_expenses_client ON field_expenses(client_name_normalized);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON field_expenses(status);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON field_expenses(category);

-- Mapeamentos de normalização
CREATE TABLE IF NOT EXISTS normalization_mappings (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  original_value VARCHAR(200) NOT NULL,
  normalized_value VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, original_value)
);

-- Conferências de extrato
CREATE TABLE IF NOT EXISTS statement_reconciliations (
  id SERIAL PRIMARY KEY,
  period_label VARCHAR(50),
  total_statement NUMERIC(12,2),
  total_system NUMERIC(12,2),
  difference NUMERIC(12,2),
  matched_count INT DEFAULT 0,
  unmatched_statement_count INT DEFAULT 0,
  unmatched_system_count INT DEFAULT 0,
  result_json JSONB,
  filters_json JSONB,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: Técnicos
INSERT INTO technicians (name) VALUES
('ALEJANDRO RAFAEL DAMAS PEREZ'), ('DALVO SEVALDO KRABBE'), ('CLARICE PICOLI'),
('EDERSON RODRIGUES DA SILVA'), ('EZEQUIEL ANDRADE DE ABREU'), ('GILBERTO KRASUCKI'),
('JOSE DALMO VAZ'), ('JULIO CESAR BASTOS CHAVES SLEUMER'), ('LUCAS WAGNER DE PAULA'),
('LUIS FERNANDO CHAVES BARBOSA'), ('LUIS HENRIQUE SILVA DOS SANTOS'),
('LUIZ DEMBINSKI'), ('MARCELO DE JESUS LEANDRO'), ('RONEY FERNANDO ROSSETTO'),
('THIAGO ROBINSON DE PAULA'), ('VALDECIR SEMENUK')
ON CONFLICT DO NOTHING;

-- Seed: Veículos
INSERT INTO fleet_vehicles (plate, model, description) VALUES
('OOL5J87','Amarok','AMAROK - OOL5J87'),
('IZD6A28','Fiat Ducato','FIAT DUCATO - IZD6A28'),
('NAU3B67','Fiat Toro','FIAT TORO - NAU3B67'),
('JCQ7I62','Hilux','HILUX - JCQ7I62'),
('JDM0G25','Hilux','HILUX - JDM0G25'),
('JDC3F27','Jumpy Cargo','JUMPY CARGO - JDC3F27'),
('JAF3J10','Jumpy','JUMPY - JAF3J10'),
('IZY3I75','Kia Bongo','KIA BONGO - IZY3I75'),
('ITI8766','Master','MASTER - ITI8766'),
('JDA9E08','Peugeot','PEUGEOT - JDA9E08 UBERLÂNDIA'),
('ITM9297','Saveiro','SAVEIRO - ITM9297'),
('RNE7A80','Saveiro','SAVEIRO - RNE7A80'),
('TQZ7A52','Kangoo','KANGOO - TQZ7A52')
ON CONFLICT (plate) DO NOTHING;
