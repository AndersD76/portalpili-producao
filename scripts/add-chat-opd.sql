-- Criar tabela de comentários/chat para OPDs
CREATE TABLE IF NOT EXISTS comentarios_opd (
  id SERIAL PRIMARY KEY,
  numero_opd VARCHAR(255) NOT NULL,
  usuario_id INTEGER REFERENCES usuarios(id),
  usuario_nome VARCHAR(255) NOT NULL,
  usuario_id_funcionario VARCHAR(50),
  mensagem TEXT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'COMENTARIO', -- COMENTARIO, NOTA, ALERTA, etc.
  arquivos JSONB, -- Array de arquivos anexados
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_comentarios_numero_opd ON comentarios_opd(numero_opd);
CREATE INDEX IF NOT EXISTS idx_comentarios_usuario_id ON comentarios_opd(usuario_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_created ON comentarios_opd(created DESC);

-- Trigger para atualizar updated
CREATE OR REPLACE FUNCTION update_comentarios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comentarios_timestamp
BEFORE UPDATE ON comentarios_opd
FOR EACH ROW
EXECUTE FUNCTION update_comentarios_timestamp();

COMMENT ON TABLE comentarios_opd IS 'Comentários e mensagens de chat atrelados às OPDs';
COMMENT ON COLUMN comentarios_opd.tipo IS 'Tipo de mensagem: COMENTARIO, NOTA, ALERTA';
COMMENT ON COLUMN comentarios_opd.arquivos IS 'Array JSON de arquivos anexados à mensagem';
