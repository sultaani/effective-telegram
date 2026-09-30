// Creates the first super administrator on a fresh database (after migrations).
// Usage: ADMIN_EMAIL=you@college.edu.ng ADMIN_NAME="Your Name" ADMIN_PASSWORD='long-password-1' npm run create-admin
import { closeDb, insert, one, run } from "../src/db";
import { hashPassword, passwordProblem } from "../src/lib/password";

async function main() {
  const email = process.env.ADMIN_EMAIL, name = process.env.ADMIN_NAME, pw = process.env.ADMIN_PASSWORD;
  if (!email || !name || !pw) { console.error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD."); process.exit(1); }
  const problem = passwordProblem(pw);
  if (problem) { console.error(problem); process.exit(1); }
  if (await one("SELECT 1 AS x FROM users WHERE lower(email)=lower(?)", email)) { console.error("That user already exists."); process.exit(1); }
  const id = await insert("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)", email, name, hashPassword(pw), Date.now());
  await run("INSERT INTO user_roles(user_id,role) VALUES(?,'SUPER_ADMIN')", id);
  await run("INSERT INTO audit_log(actor_id,action,entity,entity_id,created_at) VALUES(NULL,'admin.bootstrap','user',?,?)", String(id), Date.now());
  console.log(`Super administrator created: ${email}`);
  await closeDb();
}
main().catch((e) => { console.error(e); process.exit(1); });
