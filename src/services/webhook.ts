import { verifySignature } from "../lib/payments";
import { settlePayment } from "./fees";

/** Shared by the public webhook route and the demo gateway simulator. Trusts nothing until the HMAC signature verifies. */
export function processWebhook(rawBody: string, signature: string | null): { status: number; body: { ok: boolean; error?: string; result?: string } } {
  if (!signature || !verifySignature(rawBody, signature)) return { status: 401, body: { ok: false, error: "Invalid signature" } };
  let p: { reference?: string; amount_kobo?: number; status?: string; gateway_ref?: string; method?: string };
  try { p = JSON.parse(rawBody); } catch { return { status: 400, body: { ok: false, error: "Bad payload" } }; }
  if (typeof p.reference !== "string" || !Number.isInteger(p.amount_kobo) || (p.status !== "success" && p.status !== "failed"))
    return { status: 400, body: { ok: false, error: "Bad payload" } };
  const r = settlePayment(p.reference, p.amount_kobo as number, p.status, String(p.gateway_ref ?? "n/a").slice(0, 60), String(p.method ?? "card").slice(0, 20));
  return r.ok ? { status: 200, body: { ok: true, result: r.value } } : { status: 422, body: { ok: false, error: r.error } };
}
