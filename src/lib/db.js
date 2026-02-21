// src/lib/db.js
// ─────────────────────────────────────────────────────────────
// PostgreSQL connection pool — shared across the entire app.
// Next.js can hot-reload in dev, so we cache the pool on the
// global object to avoid creating a new pool on every reload.
// ─────────────────────────────────────────────────────────────

import { Pool } from 'pg';

const poolConfig = {
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:      10,              // max connections in pool
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 2000,
};

// Prevent multiple pools during Next.js hot reload in dev
const globalForPg = globalThis;

const pool = globalForPg._pgPool ?? new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalForPg._pgPool = pool;
}

// ─── Query helper ─────────────────────────────────────────────
// Usage: const { rows } = await query('SELECT * FROM users WHERE id = $1', [id])
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB]', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
  } catch (error) {
    console.error('[DB ERROR]', { text, error: error.message });
    throw error;
  }
}

// ─── Transaction helper ───────────────────────────────────────
// Usage:
//   await withTransaction(async (client) => {
//     await client.query(...)
//     await client.query(...)
//   })
export async function withTransaction(fn) {
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