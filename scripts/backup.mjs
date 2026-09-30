// Logical backup of every table to gzip-compressed JSON. Complements (does not replace) Neon point-in-time restore.
// Usage: node scripts/backup.mjs [backupDir] [keep]   (schedule daily; copy the folder off the platform)
try { process.loadEnvFile(".env"); } catch { /* no .env file: use the environment */ }
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is not set."); process.exit(1); }
const dir = path.resolve(process.argv[2] || "backups");
const keep = Number(process.argv[3] || 14);
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const c = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });
await c.connect();
const target = path.join(dir, new Date().toISOString().replace(/[:.]/g, "-"));
fs.mkdirSync(target, { recursive: true });
await c.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY"); // consistent snapshot across tables
const tables = (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1")).rows.map((r) => r.tablename);
for (const t of tables) {
  const rows = (await c.query(`SELECT * FROM "${t}"`)).rows;
  const json = JSON.stringify(rows, (_, v) => (Buffer.isBuffer(v) ? { $b64: v.toString("base64") } : typeof v === "bigint" ? Number(v) : v));
  fs.writeFileSync(path.join(target, `${t}.json.gz`), zlib.gzipSync(json), { mode: 0o600 });
}
await c.query("COMMIT");
await c.end();
const all = fs.readdirSync(dir).filter((d) => /^\d{4}-/.test(d)).sort();
for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(dir, old), { recursive: true, force: true });
console.log(`Backup of ${tables.length} tables written to ${target}. Kept ${Math.min(all.length, keep)} backups.`);
