import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./migrations";

type G = typeof globalThis & { __kcoeDb?: Database.Database };
const g = globalThis as G;

export function dataDir(): string {
  return path.resolve(process.cwd(), "data");
}

function migrate(d: Database.Database) {
  d.exec("CREATE TABLE IF NOT EXISTS schema_migrations(id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at INTEGER NOT NULL)");
  const applied = new Set((d.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]).map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    d.transaction(() => {
      d.exec(m.sql);
      d.prepare("INSERT INTO schema_migrations(id, name, applied_at) VALUES(?,?,?)").run(m.id, m.name, Date.now());
    })();
  }
}

export function openDb(file?: string): Database.Database {
  const target = file ?? process.env.DATABASE_FILE ?? path.join(dataDir(), "kcoe.db");
  if (target !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  const d = new Database(target);
  d.pragma("journal_mode = WAL");
  d.pragma("foreign_keys = ON");
  d.pragma("busy_timeout = 5000");
  migrate(d);
  return d;
}

export function db(): Database.Database {
  if (!g.__kcoeDb) g.__kcoeDb = openDb();
  return g.__kcoeDb;
}

export const one = <T,>(sql: string, ...p: unknown[]) => db().prepare(sql).get(...p) as T | undefined;
export const all = <T,>(sql: string, ...p: unknown[]) => db().prepare(sql).all(...p) as T[];
export const run = (sql: string, ...p: unknown[]) => db().prepare(sql).run(...p);
export const tx = <T,>(fn: () => T): T => db().transaction(fn)();
