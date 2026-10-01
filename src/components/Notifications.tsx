import Link from "next/link";
import { all } from "../db";
import { dateTime } from "../lib/format";
import { markAllRead } from "../app/actions/notifications";
import { Empty } from "./bits";

export async function NotificationList({ userId }: { userId: number }) {
  const rows = await all<{ id: number; title: string; body: string; link: string | null; read_at: number | null; created_at: number }>(
    "SELECT id,title,body,link,read_at,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50", userId);
  return (
    <>
      <div className="row between"><h1>Notifications</h1>{rows.some((r) => !r.read_at) && <form action={markAllRead}><button className="btn secondary small">Mark all as read</button></form>}</div>
      {rows.length === 0 ? <Empty title="You are all caught up">New notifications will appear here.</Empty> : (
        <div className="panel" style={{ padding: 0 }}>
          {rows.map((n) => (
            <div key={n.id} style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: n.read_at ? "transparent" : "var(--navy-tint)" }}>
              <div className="row between"><strong>{n.title}{!n.read_at && <span className="badge info" style={{ marginLeft: 8 }}>New</span>}</strong><span className="small muted">{dateTime(n.created_at)}</span></div>
              <p style={{ margin: "4px 0 0" }}>{n.body} {n.link && <Link href={n.link}>Open</Link>}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
