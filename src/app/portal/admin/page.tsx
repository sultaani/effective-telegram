import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "../../../lib/auth";
import { ADMIN_ROLES, can } from "../../../lib/permissions";
import { one, all } from "../../../db";
import { feeSummary } from "../../../services/fees";
import { pendingRegistrations } from "../../../services/registration";
import { approvalQueue } from "../../../services/results";
import { naira, dateTime } from "../../../lib/format";
import { KeyDates } from "../../../components/KeyDates";

export const metadata: Metadata = { title: "Administration dashboard" };

export default async function Page() {
  const s = await requireSession(ADMIN_ROLES);
  const a = s.actor;
  const items: { href: string; text: string }[] = [];
  const cards: { v: string; l: string }[] = [];
  if (can(a, "registration:approve")) { const n = (await pendingRegistrations()).length; cards.push({ v: String(n), l: "Registrations awaiting approval" }); if (n) items.push({ href: "/portal/admin/registrations", text: `${n} course registrations need a decision` }); }
  if (can(a, "results:publish")) { const n = (await approvalQueue(a, "HOD_APPROVED")).length; cards.push({ v: String(n), l: "Courses ready to publish" }); if (n) items.push({ href: "/portal/admin/results", text: `${n} courses are approved and ready to publish` }); }
  if (can(a, "fees:manage")) { const f = await feeSummary(); cards.push({ v: naira(f.charged - f.paid), l: "Fees still to collect" }, { v: String(f.pending), l: "Payments pending confirmation" }); if (f.failed) items.push({ href: "/portal/admin/fees?status=FAILED", text: `${f.failed} failed payments to review` }); }
  if (can(a, "cms:review")) { const n = (await one<{ n: number }>("SELECT COUNT(*) n FROM content_items WHERE status='REVIEW'"))!.n; const u = (await one<{ n: number }>("SELECT COUNT(*) n FROM content_items WHERE verification='AWAITING_CONFIRMATION' AND status='PUBLISHED'"))!.n;
    cards.push({ v: String(n), l: "Content awaiting review" }, { v: String(u), l: "Published items awaiting confirmation" }); if (n) items.push({ href: "/portal/admin/cms?status=REVIEW", text: `${n} website items are waiting for review` }); }
  if (can(a, "users:manage")) { const n = (await one<{ n: number }>("SELECT COUNT(*) n FROM users WHERE locked_until > ?", Date.now()))!.n; cards.push({ v: String(n), l: "Locked accounts" }); if (n) items.push({ href: "/portal/admin/users", text: `${n} accounts are temporarily locked` }); }
  const recent = can(a, "audit:read") ? await all<{ id: number; action: string; entity: string; created_at: number }>("SELECT id,action,entity,created_at FROM audit_log ORDER BY id DESC LIMIT 6") : [];
  return (
    <>
      <h1>Welcome, {s.user.name}</h1>
      <div className="panel"><h2>What needs action</h2>{items.length ? <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>{items.map((i) => <li key={i.href}><Link href={i.href}>{i.text}</Link></li>)}</ul> : <p style={{ margin: 0 }}>Nothing is waiting for you.</p>}</div>
      <KeyDates />
      <div className="grid cols-4" style={{ marginBottom: "24px" }}>{cards.map((c) => <div key={c.l} className="panel stat" style={{ margin: 0 }}><div className="v">{c.v}</div><div className="l">{c.l}</div></div>)}</div>
      {recent.length > 0 && <div className="panel"><h2>Recent activity</h2><ul style={{ margin: 0, paddingLeft: "1.2rem" }}>{recent.map((r) => <li key={r.id}><code>{r.action}</code> on {r.entity} <span className="small muted">{dateTime(r.created_at)}</span></li>)}</ul><p style={{ margin: "12px 0 0" }}><Link href="/portal/admin/audit">Full audit log</Link></p></div>}
    </>
  );
}
