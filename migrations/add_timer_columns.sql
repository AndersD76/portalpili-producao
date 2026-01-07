-- Adicionar colunas para o sistema de timer nas atividades
-- Execute este script no banco de dados PostgreSQL

-- Coluna para armazenar o tempo total acumulado em segundos
ALTER TABLE registros_atividades
ADD COLUMN IF NOT EXISTS tempo_acumulado_segundos INTEGER DEFAULT 0;

-- Coluna para armazenar o timestamp do último início (para calcular tempo corrente)
ALTER TABLE registros_atividades
ADD COLUMN IF NOT EXISTS ultimo_inicio TIMESTAMP WITH TIME ZONE;

-- Coluna para armazenar os logs de ações (JSONB)
ALTER TABLE registros_atividades
ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;

-- Atualizar o check constraint de status para incluir 'PAUSADA'
-- Primeiro remover o constraint existente se houver
ALTER TABLE registros_atividades
DROP CONSTRAINT IF EXISTS registros_atividades_status_check;

-- Depois adicionar o novo constraint
ALTER TABLE registros_atividades
ADD CONSTRAINT registros_atividades_status_check
CHECK (status IN ('A REALIZAR', 'EM ANDAMENTO', 'PAUSADA', 'CONCLUÍDA'));

-- Criar índice para busca por status
CREATE INDEX IF NOT EXISTS idx_registros_atividades_status
ON registros_atividades(status);

-- Criar índice para busca por ultimo_inicio (atividades em andamento)
CREATE INDEX IF NOT EXISTS idx_registros_atividades_ultimo_inicio
ON registros_atividades(ultimo_inicio)
WHERE ultimo_inicio IS NOT NULL;

COMMENT ON COLUMN registros_atividades.tempo_acumulado_segundos IS 'Tempo total acumulado em segundos (incluindo pausas)';
COMMENT ON COLUMN registros_atividades.ultimo_inicio IS 'Timestamp do último início/retomada da atividade';
COMMENT ON COLUMN registros_atividades.logs IS 'Array JSON de logs de ações: [{timestamp, usuario_nome, usuario_id, acao}]';
