import { NextResponse } from "next/server";
import { processWebhook } from "../../../../services/webhook";

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 10_000) return NextResponse.json({ ok: false, error: "Too large" }, { status: 413 });
  const r = processWebhook(raw, req.headers.get("x-signature"));
  return NextResponse.json(r.body, { status: r.status });
}
