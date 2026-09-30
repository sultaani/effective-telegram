// Restores a logical backup into a database that already has the schema (run `npm run migrate` first).
// DESTRUCTIVE: existing rows are removed. Usage: CONFIRM=yes node scripts/restore.mjs backups/<timestamp>
try { process.loadEnvFile(".env"); } catch { /* no .env file: use the environment */ }
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const src = path.resolve(process.argv[2] || "");
if (!fs.existsSync(src) || process.env.CONFIRM !== "yes") { console.error("Usage: CONFIRM=yes node scripts/restore.mjs backups/<timestamp>"); process.exit(1); }
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const c = new pg.Client({ connectionString: url, ssl: local ? undefined : { rejectUnauthorized: true } });
await c.connect();
const files = fs.readdirSync(src).filter((f) => f.endsWith(".json.gz"));
await c.query("BEGIN");
try {
  const names = files.map((f) => f.replace(".json.gz", "")).filter((t) => t !== "schema_migrations");
  await c.query(`TRUNCATE ${names.map((t) => `"${t}"`).join(",")} RESTART IDENTITY CASCADE`);
  for (const f of files) {
    const t = f.replace(".json.gz", ""); if (t === "schema_migrations") continue;
    const rows = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(src, f))).toString(), (_, v) => (v && typeof v === "object" && v.$b64 ? Buffer.from(v.$b64, "base64") : v));
    for (const r of rows) {
      const cols = Object.keys(r);
      await c.query(`INSERT INTO "${t}"(${cols.map((k) => `"${k}"`).join(",")}) VALUES(${cols.map((_, i) => `$${i + 1}`).join(",")})`, cols.map((k) => r[k]));
    }
    const seq = await c.query("SELECT pg_get_serial_sequence($1,'id') s", [`"${t}"`]);
    if (seq.rows[0]?.s) await c.query(`SELECT setval($1, COALESCE((SELECT MAX(id) FROM "${t}"),1))`, [seq.rows[0].s]);
  }
  await c.query("COMMIT");
  console.log("Restored from", src);
} catch (e) { await c.query("ROLLBACK"); console.error("Restore failed and was rolled back:", e.message); process.exit(1); }
await c.end();
