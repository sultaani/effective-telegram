import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { all } from "../../../../db";
import { SupportForm } from "./SupportForm";
import { StatusBadge, Empty } from "../../../../components/bits";
import { dateTime } from "../../../../lib/format";

export const metadata: Metadata = { title: "Support" };

export default async function Page() {
  const s = await requireSession(["STUDENT"]);
  const rows = all<{ id: number; subject: string; status: string; created_at: number }>("SELECT id,subject,status,created_at FROM support_requests WHERE user_id=? ORDER BY id DESC LIMIT 20", s.user.id);
  return (
    <>
      <h1>Support</h1>
      <div className="grid cols-2">
        <div className="panel"><h2>New request</h2><SupportForm /></div>
        <div className="panel"><h2>Your requests</h2>{rows.length === 0 ? <Empty title="No requests yet" /> : rows.map((r) => <p key={r.id}><strong>{r.subject}</strong> <StatusBadge status={r.status} /><br /><span className="small muted">{dateTime(r.created_at)}</span></p>)}</div>
      </div>
    </>
  );
}
