// Starts a throwaway local PostgreSQL (for development/tests only) and prints its connection string.
// Production uses Neon: set DATABASE_URL in .env instead.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

const dir = process.env.LOCAL_PG_DIR || ".local-pg";
const port = Number(process.env.LOCAL_PG_PORT || 54329);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "kcoe", password: "kcoe", port, persistent: true, createPostgresUser: process.getuid?.() === 0 });
if (!fs.existsSync(`${dir}/PG_VERSION`)) await pg.initialise();
try { await pg.start(); } catch (e) {
  console.error("\nCould not start the local Postgres (" + (e?.message || "unknown error") + ").\nOn Windows the port may be reserved: try another one, e.g.  $env:LOCAL_PG_PORT=54400; npm run db:local\nYou do not need this command if you use a Neon database.");
  process.exit(1);
}
for (const name of ["kcoe", "kcoe_test"]) { try { await pg.createDatabase(name); } catch { /* exists */ } }
console.log(`Local Postgres ready: postgres://kcoe:kcoe@localhost:${port}/kcoe`);
process.on("SIGINT", async () => { await pg.stop(); process.exit(0); });
process.on("SIGTERM", async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
