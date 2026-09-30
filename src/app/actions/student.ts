"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "../../lib/auth";
import { saveRegistration } from "../../services/registration";
import { initiatePayment, paymentByReference } from "../../services/fees";
import { processWebhook } from "../../services/webhook";
import { sign } from "../../lib/payments";
import { run } from "../../db";
import type { FormState } from "../../components/ActionForm";

async function student() {
  const s = await requireSession(["STUDENT"]);
  if (!s.actor.studentId) throw new Error("No student record");
  return { ...s, studentId: s.actor.studentId };
}

export async function registrationAction(_: FormState, data: FormData): Promise<FormState> {
  const s = await student();
  const ids = data.getAll("course").map((v) => Number(v)).filter((n) => Number.isInteger(n));
  const submit = data.get("intent") === "submit";
  const r = await saveRegistration(s.studentId, s.user.id, ids, submit);
  revalidatePath("/portal/student", "layout");
  return r.ok ? { ok: true, message: submit ? "Registration submitted. The Registrar's office will review it." : "Draft saved. Submit when you are ready." } : { error: r.error };
}

export async function payInvoice(data: FormData) {
  const s = await student();
  const id = z.coerce.number().int().safeParse(data.get("invoice"));
  if (!id.success) redirect("/portal/student/fees?e=invoice");
  const r = await initiatePayment(s.studentId, id.data);
  if (!r.ok) redirect(`/portal/student/fees?e=${encodeURIComponent(r.error)}`);
  redirect(`/pay/${r.value}`);
}

/** Demo gateway: signs a webhook payload exactly like a real gateway would, then runs the same verified handler. */
export async function simulateGateway(data: FormData) {
  const s = await student();
  const ref = String(data.get("reference") ?? "");
  const outcome = data.get("outcome") === "success" ? "success" : "failed";
  const p = await paymentByReference(ref);
  if (!p || p.student_id !== s.studentId) redirect("/portal/student/fees");
  const body = JSON.stringify({ reference: ref, amount_kobo: p.amount_kobo, status: outcome, gateway_ref: `DEMOPAY-${Date.now()}`, method: "card" });
  await processWebhook(body, sign(body));
  revalidatePath("/portal/student", "layout");
  redirect(`/portal/student/fees?paid=${outcome === "success" ? "1" : "0"}`);
}

export async function supportAction(_: FormState, data: FormData): Promise<FormState> {
  const s = await student();
  const p = z.object({ subject: z.string().trim().min(3, "Enter a subject.").max(120), message: z.string().trim().min(10, "Describe the problem in a few words.").max(2000) })
    .safeParse({ subject: data.get("subject"), message: data.get("message") });
  if (!p.success) return { error: p.error.issues[0].message };
  await run("INSERT INTO support_requests(user_id,subject,message,created_at) VALUES(?,?,?,?)", s.user.id, p.data.subject, p.data.message, Date.now());
  revalidatePath("/portal/student/support");
  return { ok: true, message: "Your request has been sent. You will get a notification when it is answered." };
}
