// Diagnoses the database connection and content. Run: npm run doctor
import { all, closeDb, one, ready } from "../src/db";

async function main() {
  const url = process.env.DATABASE_URL;
  console.log("Host:", url ? url.replace(/^.*@/, "").replace(/[/?].*$/, "") : "(DATABASE_URL not set)");
  await ready();
  console.log("Connection: OK. Migrations:", (await all<{ id: number; name: string }>("SELECT id,name FROM schema_migrations ORDER BY id")).map((m) => `${m.id}:${m.name}`).join(", "));
  const n = async (label: string, sql: string) => { const r = await one<{ n: number }>(sql); console.log(`${label.padEnd(28)} ${r!.n}`); return r!.n; };
  const schools = await n("Schools", "SELECT COUNT(*) n FROM schools");
  const pages = await n("Published pages", "SELECT COUNT(*) n FROM content_items WHERE type='page' AND status='PUBLISHED'");
  const news = await n("Published news", "SELECT COUNT(*) n FROM content_items WHERE type='news' AND status='PUBLISHED'");
  await n("Published testimonials", "SELECT COUNT(*) n FROM content_items WHERE type='testimonial' AND status='PUBLISHED'");
  await n("Programmes", "SELECT COUNT(*) n FROM programmes");
  await n("Users", "SELECT COUNT(*) n FROM users");
  if (!schools || !pages || !news) console.log("\nContent is missing. Run `npm run migrate` (it installs the baseline site content and never overwrites edits), then restart the app.");
  else console.log("\nThe public site content is present.");
  await closeDb();
}
main().catch((e) => { console.error("Doctor could not reach the database:", e.message); process.exit(1); });
