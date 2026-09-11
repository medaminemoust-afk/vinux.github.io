import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type Db = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: Db;
};

function connect(): Db {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const pool =
    globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") globalForDb.__arenaNextJsPostgresqlPool = pool;
  return drizzle(pool);
}

/**
 * Connects on first property access rather than on import. `next build` loads
 * every route module to collect page data, so connecting at import time made
 * the whole production build fail whenever DATABASE_URL was absent — even
 * though search, radios and streaming never touch the database. Routes that do
 * use it still fail loudly, just at request time.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = (globalForDb.__arenaNextJsPostgresqlDb ??= connect());
    return Reflect.get(instance, prop, receiver);
  },
});
