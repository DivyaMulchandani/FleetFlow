import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { z } from 'zod';

const databaseEnvSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
});

const parsedEnv = databaseEnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error('Invalid database environment configuration.');
}

const env = parsedEnv.data;

const globalForPg = globalThis as typeof globalThis & {
  __fleetflowPool?: Pool;
};

const pool =
  globalForPg.__fleetflowPool ??
  new Pool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

if (env.NODE_ENV !== 'production') {
  globalForPg.__fleetflowPool = pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as unknown[]);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default pool;
