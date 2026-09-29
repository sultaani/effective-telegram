// Creates the first super administrator on a fresh (unseeded) database.
// Usage: ADMIN_EMAIL=you@college.edu.ng ADMIN_NAME="Your Name" ADMIN_PASSWORD='long-password-1' npm run create-admin
import { openDb } from "../src/db";
import { hashPassword, passwordProblem } from "../src/lib/password";

const email = process.env.ADMIN_EMAIL, name = process.env.ADMIN_NAME, pw = process.env.ADMIN_PASSWORD;
if (!email || !name || !pw) { console.error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD."); process.exit(1); }
const problem = passwordProblem(pw);
if (problem) { console.error(problem); process.exit(1); }
const db = openDb();
if (db.prepare("SELECT 1 FROM users WHERE email=?").get(email)) { console.error("That user already exists."); process.exit(1); }
const id = Number(db.prepare("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)").run(email, name, hashPassword(pw), Date.now()).lastInsertRowid);
db.prepare("INSERT INTO user_roles(user_id,role) VALUES(?,'SUPER_ADMIN')").run(id);
db.prepare("INSERT INTO audit_log(actor_id,action,entity,entity_id,created_at) VALUES(NULL,'admin.bootstrap','user',?,?)").run(String(id), Date.now());
console.log(`Super administrator created: ${email}`);
