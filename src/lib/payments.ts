import crypto from "node:crypto";

/**
 * Gateway adapter. The demo uses a built-in simulator ("DemoPay"). A real gateway (Remita, Paystack, Flutterwave)
 * replaces `initiate` and `verifyWebhook`; the rest of the system only trusts a verified server-side confirmation.
 */
export function gatewaySecret(): string {
  const s = process.env.GATEWAY_SECRET;
  if (process.env.NODE_ENV === "production" && (!s || s === "change-me-in-production")) throw new Error("GATEWAY_SECRET must be set to a private value in production.");
  return s || "dev-only-secret";
}

export function sign(payload: string): string {
  return crypto.createHmac("sha256", gatewaySecret()).update(payload).digest("hex");
}

export function verifySignature(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload), "hex");
  let given: Buffer;
  try { given = Buffer.from(signature, "hex"); } catch { return false; }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export function newReference(): string { return "KCOE-" + crypto.randomBytes(8).toString("hex").toUpperCase(); }
