// Starts a throwaway local PostgreSQL (for development/tests only) and prints its connection string.
// Production uses Neon: set DATABASE_URL in .env instead.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

const dir = process.env.LOCAL_PG_DIR || ".local-pg";
const port = Number(process.env.LOCAL_PG_PORT || 5433);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "kcoe", password: "kcoe", port, persistent: true, createPostgresUser: process.getuid?.() === 0 });
if (!fs.existsSync(`${dir}/PG_VERSION`)) await pg.initialise();
await pg.start();
for (const name of ["kcoe", "kcoe_test"]) { try { await pg.createDatabase(name); } catch { /* exists */ } }
console.log(`Local Postgres ready: postgres://kcoe:kcoe@localhost:${port}/kcoe`);
process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
process.on("SIGTERM", async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
