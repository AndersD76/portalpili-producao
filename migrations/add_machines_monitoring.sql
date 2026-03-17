-- Migration: Add machines monitoring tables for PILI_MAQ
-- Date: 2026-03-17

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Table: machines
-- ============================================
CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  machine_code VARCHAR(20) UNIQUE NOT NULL,
  location VARCHAR(100),
  cam_ip VARCHAR(50),
  cam_port INT DEFAULT 80,
  api_key VARCHAR(64) NOT NULL,
  operator_name VARCHAR(100),
  operator_shift VARCHAR(10) CHECK (operator_shift IN ('A', 'B', 'C')),
  shift_start TIME DEFAULT '07:00',
  shift_end TIME DEFAULT '15:20',
  daily_target INT DEFAULT 400,
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'alert', 'idle')),
  last_seen TIMESTAMP WITH TIME ZONE,
  linked_stages TEXT[] DEFAULT '{}',
  product_type VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: machine_events
-- ============================================
CREATE TABLE IF NOT EXISTS machine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  device_id VARCHAR(50),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('motion', 'idle', 'heartbeat', 'production')),
  intensity FLOAT DEFAULT 0,
  zone VARCHAR(5) CHECK (zone IN ('Q1', 'Q2', 'Q3', 'Q4', 'ALL')),
  snapshot_url VARCHAR(255),
  pieces_count INT,
  cycle_time_seconds INT,
  uptime_seconds INT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_machine_events_machine_created
  ON machine_events (machine_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_machine_events_type
  ON machine_events (event_type);

CREATE INDEX IF NOT EXISTS idx_machine_events_machine_type_created
  ON machine_events (machine_id, event_type, created_at DESC);

-- ============================================
-- Table: production_records
-- ============================================
CREATE TABLE IF NOT EXISTS production_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,
  pieces_produced INT DEFAULT 0,
  pieces_target INT,
  total_motion_events INT DEFAULT 0,
  total_idle_events INT DEFAULT 0,
  avg_cycle_time FLOAT,
  efficiency_pct FLOAT,
  oee_pct FLOAT,
  operator_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(machine_id, shift_date, shift)
);

CREATE INDEX IF NOT EXISTS idx_production_records_machine_date
  ON production_records (machine_id, shift_date DESC);

-- ============================================
-- Seed data: example machines
-- ============================================
INSERT INTO machines (name, machine_code, location, cam_ip, api_key, operator_name, operator_shift, shift_start, shift_end, daily_target, status, product_type, linked_stages)
VALUES
  ('Tombador #01', 'TOMB-01', 'Linha A - Erechim', '192.168.1.101', encode(gen_random_bytes(32), 'hex'), 'José Carlos', 'A', '07:00', '15:20', 400, 'offline', 'TOMBADOR', ARRAY['A - CORTE', 'B - MONTAGEM SUPERIOR E ESQUADRO', 'D - SOLDA LADO 01', 'E - SOLDA LADO 02', 'F - MONTAGEM E SOLDA INFERIOR']),
  ('Tombador #02', 'TOMB-02', 'Linha B - Erechim', '192.168.1.102', encode(gen_random_bytes(32), 'hex'), 'Maria Santos', 'A', '07:00', '15:20', 380, 'offline', 'TOMBADOR', ARRAY['G - MONTAGEM ELÉTRICA/HIDRÁULICO', 'H - MONTAGEM DAS CALHAS', 'I - TRAVADOR DE RODAS LATERAL MÓVEL', 'J - CAIXA DO TRAVA CHASSI', 'K - TRAVA CHASSI']),
  ('Coletor #01', 'COLET-01', 'Linha A - Erechim', '192.168.1.103', encode(gen_random_bytes(32), 'hex'), 'Pedro Silva', 'A', '07:00', '15:20', 600, 'offline', 'COLETOR', ARRAY['COLETOR - MONTAGEM INICIAL', 'COLETOR - COLUNA INFERIOR', 'COLETOR - COLUNA SUPERIOR', 'COLETOR - CICLONE', 'COLETOR - PINTURA'])
ON CONFLICT (machine_code) DO NOTHING;
