import { Pool } from 'pg';

// Log para debug
console.log('[DB] DATABASE_URL presente:', !!process.env.DATABASE_URL);
console.log('[DB] DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
console.log('[DB] NODE_ENV:', process.env.NODE_ENV);

if (!process.env.DATABASE_URL) {
  console.error('[DB] ERRO: DATABASE_URL não configurada!');
  console.error('[DB] Variáveis disponíveis:', Object.keys(process.env).filter(k => k.includes('DATA')));
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 5, // Reduzido para evitar esgotar conexões do NeonDB
  min: 1, // Manter pelo menos uma conexão ativa
  idleTimeoutMillis: 20000, // Fechar conexões idle mais rápido
  connectionTimeoutMillis: 20000, // Mais tempo para estabelecer conexão
  query_timeout: 60000, // Mais tempo para queries complexas
  allowExitOnIdle: true, // Permitir que o processo termine se todas conexões estiverem idle
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
});

// Liberar conexões quando o processo terminar
process.on('SIGTERM', () => {
  pool.end();
});

process.on('SIGINT', () => {
  pool.end();
});

export default pool;
