import { Pool } from "pg";

// Single pool across HMR reloads in dev.
// eslint-disable-next-line no-var
declare global { var __pgPool: Pool | undefined; }

function makePool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
}

export const pool: Pool = global.__pgPool ?? makePool();
if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

export async function query<T = unknown>(text: string, params?: unknown[]) {
  return pool.query<T extends object ? T : never>(text, params as unknown[]);
}
