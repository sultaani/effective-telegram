import crypto from "node:crypto";
import { all, insert, one, run, tx } from "../db";
import { escapeLike } from "./academics";
import { audit } from "../lib/audit";
import { hashPassword } from "../lib/password";
import { type Actor, type Role, ROLES, can } from "../lib/permissions";
import type { Result } from "./cms";

/** Roles only a SUPER_ADMIN may grant: stops an ICT admin escalating themselves or others. */
const PRIVILEGED: Role[] = ["SUPER_ADMIN", "ICT_ADMIN"];

export async function listUsers(f: { q?: string; role?: string; page?: number }, pageSize = 15) {
  const where: string[] = []; const p: unknown[] = [];
  if (f.q) { where.push("(u.name ILIKE ? ESCAPE '\\' OR u.email ILIKE ? ESCAPE '\\')"); const l = escapeLike(f.q); p.push(l, l); }
  if (f.role) { where.push("EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role=?)"); p.push(f.role); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (await one<{ n: number }>(`SELECT COUNT(*) n FROM users u ${w}`, ...p))!.n;
  const rows = await all<{ id: number; name: string; email: string; is_active: number; roles: string | null }>(
    `SELECT u.id,u.name,u.email,u.is_active,(SELECT string_agg(role, ',') FROM user_roles r WHERE r.user_id=u.id) roles
     FROM users u ${w} ORDER BY u.name LIMIT ? OFFSET ?`, ...p, pageSize, ((f.page ?? 1) - 1) * pageSize);
  return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function tempPassword(): string { return crypto.randomBytes(6).toString("base64url") + "7a"; }

export async function createStaffUser(actor: Actor, input: { name: string; email: string; roles: Role[] }): Promise<Result<{ id: number; password: string }>> {
  if (!can(actor, "users:manage")) return { ok: false, error: "You cannot manage users." };
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!input.name.trim()) return { ok: false, error: "Enter a name." };
  const roles = input.roles.filter((r) => ROLES.includes(r) && r !== "STUDENT");
  if (!roles.length) return { ok: false, error: "Choose at least one role." };
  if (roles.some((r) => PRIVILEGED.includes(r)) && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, error: "Only a super administrator can assign that role." };
  if (await one("SELECT 1 AS x FROM users WHERE lower(email)=?", email)) return { ok: false, error: "A user with that email already exists." };
  const password = tempPassword();
  const id = await tx(async () => {
    const uid = await insert("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)", email, input.name.trim(), hashPassword(password), Date.now());
    for (const role of roles) await run("INSERT INTO user_roles(user_id,role) VALUES(?,?)", uid, role);
    return uid;
  });
  await audit(actor.userId, "user.create", "user", id, roles.join(","));
  return { ok: true, value: { id, password } };
}

export async function setRoles(actor: Actor, userId: number, roles: Role[]): Promise<Result> {
  if (!can(actor, "users:manage")) return { ok: false, error: "You cannot manage users." };
  const target = (await all<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=?", userId)).map((r) => r.role);
  const clean = roles.filter((r) => ROLES.includes(r));
  const changed = [...clean.filter((r) => !target.includes(r)), ...target.filter((r) => !clean.includes(r))];
  if (changed.some((r) => PRIVILEGED.includes(r)) && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, error: "Only a super administrator can change that role." };
  if (userId === actor.userId && !clean.some((r) => PRIVILEGED.includes(r))) return { ok: false, error: "You cannot remove your own administrator access." };
  await tx(async () => { await run("DELETE FROM user_roles WHERE user_id=?", userId); for (const r of clean) await run("INSERT INTO user_roles(user_id,role) VALUES(?,?)", userId, r); });
  await audit(actor.userId, "user.roles", "user", userId, clean.join(","));
  return { ok: true, value: undefined };
}

export async function setActive(actor: Actor, userId: number, active: boolean): Promise<Result> {
  if (!can(actor, "users:manage")) return { ok: false, error: "You cannot manage users." };
  if (userId === actor.userId) return { ok: false, error: "You cannot deactivate your own account." };
  await run("UPDATE users SET is_active=? WHERE id=?", active ? 1 : 0, userId);
  if (!active) await run("DELETE FROM sessions WHERE user_id=?", userId);
  await audit(actor.userId, active ? "user.activate" : "user.deactivate", "user", userId);
  return { ok: true, value: undefined };
}

export async function resetPassword(actor: Actor, userId: number): Promise<Result<string>> {
  if (!can(actor, "users:manage")) return { ok: false, error: "You cannot manage users." };
  const targetRoles = (await all<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=?", userId)).map((r) => r.role);
  if (targetRoles.some((r) => PRIVILEGED.includes(r)) && !actor.roles.includes("SUPER_ADMIN")) return { ok: false, error: "Only a super administrator can reset that account." };
  const pw = tempPassword();
  await run("UPDATE users SET password_hash=?, failed_logins=0, locked_until=NULL WHERE id=?", hashPassword(pw), userId);
  await run("DELETE FROM sessions WHERE user_id=?", userId);
  await audit(actor.userId, "user.password_reset", "user", userId);
  return { ok: true, value: pw };
}

export async function listStudents(f: { q?: string; programme?: number; level?: number; page?: number }, pageSize = 15) {
  const where: string[] = []; const p: unknown[] = [];
  if (f.q) { where.push("(u.name ILIKE ? ESCAPE '\\' OR s.matric_no ILIKE ? ESCAPE '\\')"); const l = escapeLike(f.q); p.push(l, l); }
  if (f.programme) { where.push("s.programme_id=?"); p.push(f.programme); }
  if (f.level) { where.push("s.level=?"); p.push(f.level); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const base = `FROM students s JOIN users u ON u.id=s.user_id JOIN programmes p ON p.id=s.programme_id ${w}`;
  const total = (await one<{ n: number }>(`SELECT COUNT(*) n ${base}`, ...p))!.n;
  const rows = await all<{ id: number; name: string; email: string; matric_no: string; programme: string; level: number }>(
    `SELECT s.id,u.name,u.email,s.matric_no,p.title programme,s.level ${base} ORDER BY s.matric_no LIMIT ? OFFSET ?`, ...p, pageSize, ((f.page ?? 1) - 1) * pageSize);
  return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
