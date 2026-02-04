-- Tabela para armazenar subscriptions de push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255), -- ID ou nome do usuário
    user_nome VARCHAR(255), -- Nome do usuário para exibição
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Tabela para log de notificações enviadas (opcional, para auditoria)
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL, -- OPD_CRIADA, TAREFA_INICIADA, TAREFA_FINALIZADA, CHAT_MENSAGEM, NC_CRIADA, AC_CRIADA
    referencia VARCHAR(255), -- Número da OPD, ID da NC, etc
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    enviado_por VARCHAR(255),
    total_enviados INTEGER DEFAULT 0,
    total_falhas INTEGER DEFAULT 0,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca por tipo e data
CREATE INDEX IF NOT EXISTS idx_notification_logs_tipo ON notification_logs(tipo);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created);
