// Restore a backup: stop the app first. Usage: node scripts/restore.mjs backups/<stamp>
import fs from "node:fs";
import path from "node:path";
const src = path.resolve(process.argv[2] || "");
if (!fs.existsSync(path.join(src, "kcoe.db"))) { console.error("Usage: node scripts/restore.mjs backups/<timestamp>"); process.exit(1); }
const dbFile = path.resolve(process.env.DATABASE_FILE || "data/kcoe.db");
for (const s of ["", "-wal", "-shm"]) fs.rmSync(dbFile + s, { force: true });
fs.copyFileSync(path.join(src, "kcoe.db"), dbFile);
if (fs.existsSync(path.join(src, "uploads"))) fs.cpSync(path.join(src, "uploads"), path.join(path.dirname(dbFile), "uploads"), { recursive: true });
console.log("Restored from", src);
