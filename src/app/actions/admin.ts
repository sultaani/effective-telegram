"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission, requireSession } from "../../lib/auth";
import { ROLES, type Role } from "../../lib/permissions";
import { audit } from "../../lib/audit";
import { saveFile } from "../../lib/files";
import { slugify } from "../../lib/format";
import { createStaffUser, resetPassword, setActive, setRoles } from "../../services/users";
import { decideRegistration } from "../../services/registration";
import { decideCourse } from "../../services/results";
import { createInvoices } from "../../services/fees";
import { CONTENT_TYPES, saveContent, setVerification, transition, type ContentType, type Status, type Verification } from "../../services/cms";
import { insert, one, run, tx } from "../../db";
import type { FormState } from "../../components/ActionForm";

const refresh = () => revalidatePath("/portal/admin", "layout");
const rolesOf = (d: FormData) => d.getAll("roles").map(String).filter((r): r is Role => (ROLES as readonly string[]).includes(r));
const int = (v: FormDataEntryValue | null) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };

// ---- Users
export async function createUserAction(_: FormState, d: FormData): Promise<FormState> {
  const s = await requirePermission("users:manage");
  const r = await createStaffUser(s.actor, { name: String(d.get("name") ?? ""), email: String(d.get("email") ?? ""), roles: rolesOf(d) });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: true, message: "Account created. Give the person this temporary password securely. It is shown only once:", detail: r.value.password };
}
export async function setRolesAction(d: FormData) {
  const s = await requirePermission("users:manage");
  const id = int(d.get("user")); if (id) await setRoles(s.actor, id, rolesOf(d));
  refresh();
}
export async function toggleActiveAction(d: FormData) {
  const s = await requirePermission("users:manage");
  const id = int(d.get("user")); if (id) await setActive(s.actor, id, d.get("active") === "1");
  refresh();
}
export async function resetPasswordAction(_: FormState, d: FormData): Promise<FormState> {
  const s = await requirePermission("users:manage");
  const id = int(d.get("user")); if (!id) return { error: "Unknown user." };
  const r = await resetPassword(s.actor, id);
  return r.ok ? { ok: true, message: "Temporary password (shown once):", detail: r.value } : { error: r.error };
}

// ---- Registration and results
export async function registrationDecision(d: FormData) {
  const s = await requirePermission("registration:approve");
  const id = int(d.get("student")); if (id) await decideRegistration(s.user.id, id, d.get("decision") === "approve");
  refresh();
}
export async function publishAction(d: FormData) {
  const s = await requirePermission("results:publish");
  const c = int(d.get("course")), sem = int(d.get("semester"));
  if (c && sem) await decideCourse(s.actor, c, sem, "publish");
  refresh();
}

// ---- Fees
export async function invoiceAction(_: FormState, d: FormData): Promise<FormState> {
  const s = await requirePermission("fees:manage");
  const p = z.object({ semester: z.coerce.number().int().positive(), description: z.string().trim().min(3, "Enter a description."), naira: z.coerce.number().positive("Enter an amount greater than zero.").max(10_000_000) })
    .safeParse({ semester: d.get("semester"), description: d.get("description"), naira: d.get("naira") });
  if (!p.success) return { error: p.error.issues[0].message };
  const r = await createInvoices(s.user.id, p.data.semester, int(d.get("programme")), int(d.get("level")), p.data.description, Math.round(p.data.naira * 100));
  refresh();
  return r.ok ? { ok: true, message: r.value === 0 ? "No new invoices were needed. Those students already have this charge." : `Created ${r.value} invoices and notified the students.` } : { error: r.error };
}

// ---- CMS
export async function contentAction(_: FormState, d: FormData): Promise<FormState> {
  const s = await requirePermission("cms:draft");
  const type = String(d.get("type")) as ContentType;
  if (!CONTENT_TYPES.includes(type)) return { error: "Unknown content type." };
  let fileId: string | null = null;
  const f = d.get("file");
  if (f instanceof File && f.size > 0) {
    const saved = await saveFile(f.name, Buffer.from(await f.arrayBuffer()), "public", s.user.id);
    if ("error" in saved) return { error: saved.error };
    fileId = saved.id;
  }
  let imageUrl = String(d.get("image_url") ?? "").trim() || null;
  const img = d.get("image_file");
  if (img instanceof File && img.size > 0) {
    const saved = await saveFile(img.name, Buffer.from(await img.arrayBuffer()), "public", s.user.id);
    if ("error" in saved) return { error: saved.error };
    imageUrl = `/files/${saved.id}`;
  }
  const r = await saveContent(s.actor, {
    id: int(d.get("id")) ?? undefined, type, title: String(d.get("title") ?? ""), slug: String(d.get("slug") ?? ""), summary: String(d.get("summary") ?? "").slice(0, 400),
    body: String(d.get("body") ?? "").slice(0, 50000), audience: d.get("audience") === "students" ? "students" : d.get("audience") === "staff" ? "staff" : "public",
    event_date: String(d.get("event_date") ?? ""), event_location: String(d.get("event_location") ?? "").slice(0, 120), seo_description: String(d.get("seo_description") ?? "").slice(0, 200), file_id: fileId, image_url: imageUrl,
  });
  if (!r.ok) return { error: r.error };
  refresh();
  if (!d.get("id")) redirect(`/portal/admin/cms/${r.value}`);
  return { ok: true, message: "Saved." };
}
export async function transitionAction(d: FormData) {
  const s = await requirePermission("cms:draft");
  const id = int(d.get("id")); if (id) await transition(s.actor, id, String(d.get("to")) as Status);
  refresh();
}
export async function verifyAction(d: FormData) {
  const s = await requirePermission("cms:verify");
  const id = int(d.get("id")); if (id) await setVerification(s.actor, id, String(d.get("v")) as Verification);
  refresh();
}

// ---- Programmes and academic settings
export async function programmeAction(_: FormState, d: FormData): Promise<FormState> {
  const s = await requirePermission("programmes:manage");
  const p = z.object({ title: z.string().trim().min(3, "Enter a programme title."), department: z.coerce.number().int().positive("Choose a department."), award: z.enum(["NCE", "PDE"]), years: z.coerce.number().int().min(1).max(6) })
    .safeParse({ title: d.get("title"), department: d.get("department"), award: d.get("award"), years: d.get("years") });
  if (!p.success) return { error: p.error.issues[0].message };
  const slug = slugify(p.data.title);
  if (await one("SELECT 1 FROM programmes WHERE slug=?", slug)) return { error: "A programme with that name already exists." };
  const newId = await insert("INSERT INTO programmes(department_id,slug,title,award,duration_years,summary,entry_requirements,verification) VALUES(?,?,?,?,?,?,?,'AWAITING_CONFIRMATION')",
    p.data.department, slug, p.data.title, p.data.award, p.data.years, String(d.get("summary") ?? "").slice(0, 1000), String(d.get("entry") ?? "").slice(0, 1000));
  await audit(s.user.id, "programme.create", "programme", newId, p.data.title);
  refresh();
  return { ok: true, message: "Programme added and marked awaiting confirmation." };
}
export async function programmeVerifyAction(d: FormData) {
  const s = await requirePermission("programmes:manage");
  const id = int(d.get("id")); const v = String(d.get("v"));
  if (id && ["VERIFIED", "AWAITING_CONFIRMATION", "SAMPLE"].includes(v)) { await run("UPDATE programmes SET verification=? WHERE id=?", v, id); await audit(s.user.id, "programme.verify", "programme", id, v); }
  if (id && d.get("toggle") === "1") { await run("UPDATE programmes SET is_active=1-is_active WHERE id=?", id); await audit(s.user.id, "programme.toggle", "programme", id); }
  refresh();
}
export async function semesterAction(_: FormState, d: FormData): Promise<FormState> {
  const s = await requirePermission("config:manage");
  const sem = int(d.get("semester")); if (!sem) return { error: "Choose a semester." };
  const opens = d.get("opens") ? Date.parse(String(d.get("opens"))) : null, closes = d.get("closes") ? Date.parse(String(d.get("closes")) + "T23:59:59") : null;
  if ((opens && Number.isNaN(opens)) || (closes && Number.isNaN(closes))) return { error: "Enter valid dates." };
  if (opens && closes && closes < opens) return { error: "The closing date must be after the opening date." };
  await tx(async () => {
    await run("UPDATE semesters SET is_current=0");
    await run("UPDATE semesters SET is_current=1, reg_opens=?, reg_closes=? WHERE id=?", opens, closes, sem);
    await run("UPDATE academic_sessions SET is_current=CASE WHEN id=(SELECT session_id FROM semesters WHERE id=?) THEN 1 ELSE 0 END", sem);
  });
  await audit(s.user.id, "config.semester", "semester", sem);
  refresh();
  return { ok: true, message: "Current semester and registration window updated." };
}
