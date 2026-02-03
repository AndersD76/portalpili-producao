-- Tabela para armazenar análises de IA de qualidade
CREATE TABLE IF NOT EXISTS qualidade_ia_analises (
  id SERIAL PRIMARY KEY,
  nc_id INTEGER REFERENCES nao_conformidades(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- CAUSAS, ACOES, PADROES, RELATORIO
  resultado JSONB NOT NULL,
  modelo VARCHAR(100),
  feedback_util BOOLEAN,
  feedback_comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_qualidade_ia_nc_id ON qualidade_ia_analises(nc_id);
CREATE INDEX IF NOT EXISTS idx_qualidade_ia_tipo ON qualidade_ia_analises(tipo);
CREATE INDEX IF NOT EXISTS idx_qualidade_ia_created ON qualidade_ia_analises(created_at);

-- Comentários
COMMENT ON TABLE qualidade_ia_analises IS 'Análises de IA para não conformidades';
COMMENT ON COLUMN qualidade_ia_analises.tipo IS 'Tipo: CAUSAS, ACOES, PADROES, RELATORIO';
COMMENT ON COLUMN qualidade_ia_analises.resultado IS 'Resultado da análise em JSON';
