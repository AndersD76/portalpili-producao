import { Pool, PoolClient } from 'pg';

// Lazy pool initialization
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      min: 0,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 30000,
    });

    pool.on('error', () => {
      // Silenciar - NeonDB desconecta frequentemente
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  let retries = 3;
  while (retries > 0) {
    try {
      return await getPool().query(text, params);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.message?.includes('terminated')) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 1000));
      } else {
        throw err;
      }
    }
  }
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
