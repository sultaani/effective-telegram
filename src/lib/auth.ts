import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { all, one, run } from "../db";
import { hashPassword, verifyPassword } from "./password";
import { hit, reset } from "./rate-limit";
import { audit } from "./audit";
import { type Actor, type Permission, type Role, can, homeFor } from "./permissions";

const COOKIE = "kcoe_session";
const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const DUMMY_HASH = hashPassword("not-a-real-password-just-for-timing");

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const secureCookie = () => (process.env.APP_URL ?? "").startsWith("https");

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

export interface SessionUser { id: number; email: string; name: string }
export interface Session { user: SessionUser; actor: Actor }

export async function login(email: string, password: string): Promise<{ ok: true; roles: Role[] } | { ok: false; error: string }> {
  const ip = await clientIp();
  const generic = "Email or password is incorrect.";
  const e = email.trim().toLowerCase();
  if (!(await hit(`ip:${ip}`, 30, 15 * 60 * 1000)) || !(await hit(`email:${e}`, 10, 15 * 60 * 1000))) {
    return { ok: false, error: "Too many attempts. Wait 15 minutes and try again." };
  }
  const u = await one<{ id: number; password_hash: string; is_active: number; failed_logins: number; locked_until: number | null }>(
    "SELECT id,password_hash,is_active,failed_logins,locked_until FROM users WHERE lower(email)=?", e);
  if (!u) { verifyPassword(password, DUMMY_HASH); return { ok: false, error: generic }; }
  if (u.locked_until && u.locked_until > Date.now()) return { ok: false, error: "This account is temporarily locked. Try again later." };
  const good = verifyPassword(password, u.password_hash);
  if (!good || !u.is_active) {
    const fails = u.failed_logins + 1;
    await run("UPDATE users SET failed_logins=?, locked_until=? WHERE id=?", fails >= MAX_FAILS ? 0 : fails, fails >= MAX_FAILS ? Date.now() + LOCK_MS : null, u.id);
    await audit(u.id, "login.failed", "user", u.id, undefined, ip);
    return { ok: false, error: generic };
  }
  await run("UPDATE users SET failed_logins=0, locked_until=NULL WHERE id=?", u.id);
  await reset(`email:${e}`);
  const token = crypto.randomBytes(32).toString("base64url");
  const h = await headers();
  await run("INSERT INTO sessions(token_hash,user_id,expires_at,created_at,ip,user_agent) VALUES(?,?,?,?,?,?)",
    sha(token), u.id, Date.now() + SESSION_MS, Date.now(), ip, (h.get("user-agent") ?? "").slice(0, 200));
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secureCookie(), path: "/", maxAge: SESSION_MS / 1000 });
  await audit(u.id, "login.success", "user", u.id, undefined, ip);
  const roles = (await all<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=?", u.id)).map((r) => r.role);
  return { ok: true, roles };
}

export async function logout() {
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  if (t) await run("DELETE FROM sessions WHERE token_hash=?", sha(t));
  c.delete(COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  const s = await one<{ user_id: number; expires_at: number }>("SELECT user_id,expires_at FROM sessions WHERE token_hash=?", sha(t));
  if (!s) return null;
  if (s.expires_at < Date.now()) { await run("DELETE FROM sessions WHERE token_hash=?", sha(t)); return null; }
  const u = await one<SessionUser & { is_active: number }>("SELECT id,email,name,is_active FROM users WHERE id=?", s.user_id);
  if (!u || !u.is_active) return null;
  const roles = (await all<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=?", u.id)).map((r) => r.role);
  const staff = await one<{ id: number; department_id: number | null }>("SELECT id,department_id FROM staff WHERE user_id=?", u.id);
  const student = await one<{ id: number }>("SELECT id FROM students WHERE user_id=?", u.id);
  return {
    user: { id: u.id, email: u.email, name: u.name },
    actor: { userId: u.id, roles, departmentIds: staff?.department_id ? [staff.department_id] : [], staffId: staff?.id, studentId: student?.id },
  };
});

/** Require a signed-in user; optionally restricted to certain roles. Unauthorised users get a 404, not a hint. */
export async function requireSession(roles?: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/portal/login");
  if (roles && !s.actor.roles.some((r) => roles.includes(r))) notFound();
  return s;
}

export async function requirePermission(p: Permission): Promise<Session> {
  const s = await requireSession();
  if (!can(s.actor, p)) notFound();
  return s;
}

export { homeFor };
