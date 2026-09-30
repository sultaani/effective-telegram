import { AsyncLocalStorage } from "node:async_hooks";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { MIGRATIONS } from "./migrations";

// bigint (int8) and numeric come back as strings by default; all our ids, epoch-ms times and kobo amounts fit in a JS number.
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => parseFloat(v));

type G = typeof globalThis & { __kcoePool?: Pool; __kcoeReady?: Promise<void> };
const g = globalThis as G;
const txStore = new AsyncLocalStorage<PoolClient>();

export function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Use your Neon connection string (see .env.example).");
  return url;
}

export function pool(): Pool {
  if (!g.__kcoePool) {
    const url = connectionString();
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    g.__kcoePool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: local || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: true },
    });
    g.__kcoePool.on("error", (e) => console.error("[db] idle client error", e.message));
  }
  return g.__kcoePool;
}

/** Converts `?` placeholders to `$1..$n` so SQL stays readable. Never put user input in the SQL text itself. */
function numbered(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function migrate(): Promise<void> {
  const url = process.env.DATABASE_URL_UNPOOLED || connectionString();
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const p = url === process.env.DATABASE_URL ? pool() : new Pool({ connectionString: url, max: 1, ssl: local ? undefined : { rejectUnauthorized: true } });
  const c = await p.connect();
  try {
    await c.query("SELECT pg_advisory_lock(727001)"); // one migrator at a time across app instances
    await c.query("CREATE TABLE IF NOT EXISTS schema_migrations(id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at BIGINT NOT NULL)");
    const done = new Set((await c.query("SELECT id FROM schema_migrations")).rows.map((r) => Number(r.id)));
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      await c.query("BEGIN");
      try {
        await c.query(m.sql);
        await c.query("INSERT INTO schema_migrations(id,name,applied_at) VALUES($1,$2,$3)", [m.id, m.name, Date.now()]);
        await c.query("COMMIT");
      } catch (e) { await c.query("ROLLBACK"); throw e; }
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock(727001)").catch(() => {});
    c.release();
    if (p !== g.__kcoePool) await p.end();
  }
}

export function ready(): Promise<void> {
  if (!g.__kcoeReady) g.__kcoeReady = migrate().catch((e) => { g.__kcoeReady = undefined; throw e; });
  return g.__kcoeReady;
}

async function q<T extends QueryResultRow>(sql: string, params: unknown[]) {
  await ready();
  const client = txStore.getStore();
  return (client ?? pool()).query<T>(numbered(sql), params as unknown[]);
}

export async function one<T extends QueryResultRow = any>(sql: string, ...p: unknown[]): Promise<T | undefined> { return (await q<T>(sql, p)).rows[0]; }
export async function all<T extends QueryResultRow = any>(sql: string, ...p: unknown[]): Promise<T[]> { return (await q<T>(sql, p)).rows; }
export async function run(sql: string, ...p: unknown[]): Promise<{ changes: number }> { return { changes: (await q(sql, p)).rowCount ?? 0 }; }
/** INSERT that returns the new row id. The statement must not include RETURNING. */
export async function insert(sql: string, ...p: unknown[]): Promise<number> { return Number((await q<{ id: number }>(`${sql} RETURNING id`, p)).rows[0].id); }

/** Runs `fn` in one transaction. Every one/all/run/insert inside automatically uses the same connection. */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  await ready();
  const existing = txStore.getStore();
  if (existing) return fn();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const out = await txStore.run(client, fn);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally { client.release(); }
}

export async function closeDb() { if (g.__kcoePool) { await g.__kcoePool.end(); g.__kcoePool = undefined; g.__kcoeReady = undefined; } }
export function dataDir(): string { return process.cwd() + "/data"; }
