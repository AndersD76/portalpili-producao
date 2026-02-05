import { Pool, PoolClient } from 'pg';

// Lazy pool initialization
let pool: Pool | null = null;

// Erros que justificam retry
const RETRYABLE_ERRORS = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
];

function isRetryableError(err: any): boolean {
  if (!err) return false;
  const code = err.code || '';
  const message = err.message || '';

  return RETRYABLE_ERRORS.includes(code) ||
    message.includes('terminated') ||
    message.includes('Connection terminated') ||
    message.includes('connection lost') ||
    message.includes('timeout') ||
    message.includes('ECONNRESET') ||
    message.includes('socket hang up');
}

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,  // Aumentado para melhor performance em produção
      min: 1,   // Manter pelo menos 1 conexão ativa
      idleTimeoutMillis: 30000,  // Fechar conexões ociosas após 30s
      connectionTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      // Log do erro para diagnóstico, mas não propagar
      console.warn('[DB Pool] Erro de conexão (será reconectado):', err.message);
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  let retries = 3;
  let lastError: any;

  while (retries > 0) {
    try {
      return await getPool().query(text, params);
    } catch (err: any) {
      lastError = err;

      if (isRetryableError(err)) {
        retries--;
        if (retries === 0) {
          console.error('[DB] Falha após 3 tentativas:', err.message);
          throw err;
        }
        console.warn(`[DB] Retry ${3 - retries}/3 após erro:`, err.message);
        await new Promise(r => setTimeout(r, 1000 * (4 - retries))); // Backoff: 1s, 2s, 3s
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default {
  query: (text: string, params?: any[]) => getPool().query(text, params),
  connect: () => getPool().connect(),
};
