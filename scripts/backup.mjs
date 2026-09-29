// Consistent online backup of the database and uploads, with retention.
// Usage: node scripts/backup.mjs [backupDir] [keep]   (schedule daily with cron; copy the folder off the server)
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] || "backups");
const keep = Number(process.argv[3] || 14);
const dbFile = process.env.DATABASE_FILE || "data/kcoe.db";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(dir, stamp);
fs.mkdirSync(target, { recursive: true });

const db = new Database(dbFile, { readonly: true });
await db.backup(path.join(target, "kcoe.db"));
db.close();
const uploads = path.join(path.dirname(dbFile), "uploads");
if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(target, "uploads"), { recursive: true });

const all = fs.readdirSync(dir).filter((d) => /^\d{4}-/.test(d)).sort();
for (const old of all.slice(0, Math.max(0, all.length - keep))) fs.rmSync(path.join(dir, old), { recursive: true, force: true });
console.log(`Backup written to ${target}. Kept ${Math.min(all.length, keep)} backups.`);
