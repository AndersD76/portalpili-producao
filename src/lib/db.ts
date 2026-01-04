import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo que uma conexão pode ficar idle
  connectionTimeoutMillis: 10000, // Timeout para estabelecer conexão
  query_timeout: 30000, // Timeout para queries
});

// Tratamento de erros do pool
pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões:', err);
});

export default pool;
