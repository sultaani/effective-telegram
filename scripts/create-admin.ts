// Creates the first super administrator on a fresh database (after migrations).
// Usage: npm run create-admin -- --email you@college.edu.ng --name "Your Name" --password "a-long-passphrase-1"
import { closeDb, insert, one, run } from "../src/db";
import { hashPassword, passwordProblem } from "../src/lib/password";

async function main() {
  const flag = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
  const email = flag("email") ?? process.env.ADMIN_EMAIL, name = flag("name") ?? process.env.ADMIN_NAME, pw = flag("password") ?? process.env.ADMIN_PASSWORD;
  if (!email || !name || !pw) { console.error('Usage: npm run create-admin -- --email you@college.edu.ng --name "Your Name" --password "a-long-passphrase-1"'); process.exit(1); }
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
