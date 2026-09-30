import { all, one, run, tx } from "../db";
import { audit } from "../lib/audit";
import { notify } from "../lib/notify";
import { newReference } from "../lib/payments";
import { escapeLike } from "./academics";
import type { Result } from "./cms";

export interface InvoiceRow { id: number; description: string; amount_kobo: number; paid_kobo: number; balance_kobo: number; due_date: string | null; semester: string; pending: number }

const INV_SQL = `SELECT i.id,i.description,i.amount_kobo,i.due_date,
  COALESCE((SELECT SUM(p.amount_kobo) FROM payments p WHERE p.invoice_id=i.id AND p.status='SUCCESSFUL'),0) AS paid_kobo,
  i.amount_kobo - COALESCE((SELECT SUM(p.amount_kobo) FROM payments p WHERE p.invoice_id=i.id AND p.status='SUCCESSFUL'),0) AS balance_kobo,
  (SELECT COUNT(*) FROM payments p WHERE p.invoice_id=i.id AND p.status='PENDING') AS pending,
  a.label || ' · ' || CASE s.number WHEN 1 THEN 'First' ELSE 'Second' END || ' semester' AS semester
  FROM invoices i JOIN semesters s ON s.id=i.semester_id JOIN academic_sessions a ON a.id=s.session_id`;

export const studentInvoices = (studentId: number) => all<InvoiceRow>(`${INV_SQL} WHERE i.student_id=? ORDER BY i.id DESC`, studentId);
export const studentPayments = (studentId: number) =>
  all<{ reference: string; amount_kobo: number; status: string; method: string | null; paid_at: number | null; created_at: number; description: string }>(
    `SELECT p.reference,p.amount_kobo,p.status,p.method,p.paid_at,p.created_at,i.description FROM payments p JOIN invoices i ON i.id=p.invoice_id
     WHERE i.student_id=? ORDER BY p.id DESC`, studentId);
export async function outstanding(studentId: number): Promise<number> { return (await studentInvoices(studentId)).reduce((s, i) => s + i.balance_kobo, 0); }

/** Creates a PENDING payment for the invoice's full balance. Ownership is enforced here, not in the UI. */
export async function initiatePayment(studentId: number, invoiceId: number): Promise<Result<string>> {
  const inv = await one<InvoiceRow>(`${INV_SQL} WHERE i.id=? AND i.student_id=?`, invoiceId, studentId);
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.balance_kobo <= 0) return { ok: false, error: "This invoice is already fully paid." };
  const ref = newReference();
  await run("INSERT INTO payments(invoice_id,reference,amount_kobo,status,created_at) VALUES(?,?,?,'PENDING',?)", invoiceId, ref, inv.balance_kobo, Date.now());
  return { ok: true, value: ref };
}

export type GatewayStatus = "success" | "failed";

/** Called ONLY by the webhook route after signature verification. Idempotent; the amount must match. */
export async function settlePayment(reference: string, amountKobo: number, status: GatewayStatus, gatewayRef: string, method = "card"): Promise<Result<"settled" | "already" | "ignored">> {
  const p = await one<{ id: number; invoice_id: number; amount_kobo: number; status: string }>("SELECT id,invoice_id,amount_kobo,status FROM payments WHERE reference=?", reference);
  if (!p) return { ok: false, error: "Unknown reference." };
  if (p.status !== "PENDING") return { ok: true, value: "already" };
  if (status === "success" && amountKobo !== p.amount_kobo) {
    await audit(null, "payment.amount_mismatch", "payment", p.id, `expected ${p.amount_kobo} got ${amountKobo}`);
    return { ok: false, error: "Amount mismatch." };
  }
  if (status === "failed") { await run("UPDATE payments SET status='FAILED', gateway_ref=? WHERE id=? AND status='PENDING'", gatewayRef, p.id); return { ok: true, value: "settled" }; }
  const changed = (await run("UPDATE payments SET status='SUCCESSFUL', gateway_ref=?, method=?, paid_at=? WHERE id=? AND status='PENDING'", gatewayRef, method, Date.now(), p.id)).changes;
  if (!changed) return { ok: true, value: "already" }; // a concurrent webhook won the race
  const who = (await one<{ user_id: number; description: string }>("SELECT s.user_id, i.description FROM invoices i JOIN students s ON s.id=i.student_id WHERE i.id=?", p.invoice_id))!;
  await notify(who.user_id, "payment", "Payment received", `Your payment for ${who.description} was confirmed. Reference ${reference}.`, "/portal/student/fees");
  await audit(null, "payment.success", "payment", p.id, reference);
  return { ok: true, value: "settled" };
}

export const receipt = (studentId: number, reference: string) =>
  one<{ reference: string; amount_kobo: number; method: string | null; paid_at: number; description: string; name: string; matric_no: string; programme: string; gateway_ref: string | null }>(
    `SELECT p.reference,p.amount_kobo,p.method,p.paid_at,p.gateway_ref,i.description,u.name,s.matric_no,pr.title programme
     FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN students s ON s.id=i.student_id JOIN users u ON u.id=s.user_id JOIN programmes pr ON pr.id=s.programme_id
     WHERE p.reference=? AND s.id=? AND p.status='SUCCESSFUL'`, reference, studentId);

export const paymentByReference = (reference: string) =>
  one<{ reference: string; amount_kobo: number; status: string; student_id: number; description: string }>(
    "SELECT p.reference,p.amount_kobo,p.status,i.student_id,i.description FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE p.reference=?", reference);

export async function createInvoices(actorId: number, semesterId: number, programmeId: number | null, level: number | null, description: string, amountKobo: number): Promise<Result<number>> {
  if (!description.trim()) return { ok: false, error: "Enter a description." };
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) return { ok: false, error: "Enter an amount greater than zero." };
  const where = ["id NOT IN (SELECT student_id FROM invoices WHERE semester_id=? AND description=?)"]; const p: unknown[] = [semesterId, description.trim()];
  if (programmeId) { where.push("programme_id=?"); p.push(programmeId); }
  if (level) { where.push("level=?"); p.push(level); }
  const students = await all<{ id: number; user_id: number }>(`SELECT id,user_id FROM students WHERE ${where.join(" AND ")}`, ...p);
  await tx(async () => {
    for (const s of students) {
      await run("INSERT INTO invoices(student_id,semester_id,description,amount_kobo,created_at) VALUES(?,?,?,?,?)", s.id, semesterId, description.trim(), amountKobo, Date.now());
      await notify(s.user_id, "fees", "New invoice", `${description.trim()} has been added to your account.`, "/portal/student/fees");
    }
  });
  await audit(actorId, "fees.invoice.bulk", "invoice", undefined, `${students.length} students`);
  return { ok: true, value: students.length };
}

export const feeSummary = async () => (await one<{ charged: number; paid: number; pending: number; failed: number }>(
  `SELECT COALESCE((SELECT SUM(amount_kobo) FROM invoices),0) charged,
     COALESCE((SELECT SUM(amount_kobo) FROM payments WHERE status='SUCCESSFUL'),0) paid,
     (SELECT COUNT(*) FROM payments WHERE status='PENDING') pending,
     (SELECT COUNT(*) FROM payments WHERE status='FAILED') failed`))!;

export async function adminPayments(f: { q?: string; status?: string; page?: number }, pageSize = 20) {
  const where: string[] = []; const p: unknown[] = [];
  if (f.status) { where.push("p.status=?"); p.push(f.status); }
  if (f.q) { where.push("(u.name ILIKE ? ESCAPE '\\' OR s.matric_no ILIKE ? ESCAPE '\\' OR p.reference ILIKE ? ESCAPE '\\')"); const l = escapeLike(f.q); p.push(l, l, l); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const base = `FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN students s ON s.id=i.student_id JOIN users u ON u.id=s.user_id ${w}`;
  const total = (await one<{ n: number }>(`SELECT COUNT(*) n ${base}`, ...p))!.n;
  const rows = await all<{ reference: string; name: string; matric_no: string; description: string; amount_kobo: number; status: string; paid_at: number | null; created_at: number }>(
    `SELECT p.reference,u.name,s.matric_no,i.description,p.amount_kobo,p.status,p.paid_at,p.created_at ${base} ORDER BY p.id DESC LIMIT ? OFFSET ?`, ...p, pageSize, ((f.page ?? 1) - 1) * pageSize);
  return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
