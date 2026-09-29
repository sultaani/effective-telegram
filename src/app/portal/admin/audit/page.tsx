import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { all, one } from "../../../../db";
import { Pagination, pageNum, str } from "../../../../components/bits";
import { dateTime } from "../../../../lib/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("audit:read");
  const sp = await searchParams; const q = str(sp.q), page = pageNum(sp.page);
  const like = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : "%";
  const total = one<{ n: number }>("SELECT COUNT(*) n FROM audit_log WHERE action LIKE ? ESCAPE '\\' OR entity LIKE ? ESCAPE '\\'", like, like)!.n;
  const rows = all<{ id: number; action: string; entity: string; entity_id: string | null; detail: string | null; actor: string | null; created_at: number; ip: string | null }>(
    `SELECT a.id,a.action,a.entity,a.entity_id,a.detail,a.ip,a.created_at,u.name actor FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id
     WHERE a.action LIKE ? ESCAPE '\\' OR a.entity LIKE ? ESCAPE '\\' ORDER BY a.id DESC LIMIT 25 OFFSET ?`, like, like, (page - 1) * 25);
  return (
    <>
      <h1>Audit log</h1><p className="muted">Sensitive actions are recorded here and cannot be edited from the portal.</p>
      <form className="filters" role="search"><div className="field"><label htmlFor="q">Filter by action or record</label><input id="q" name="q" type="search" defaultValue={q} placeholder="for example: login, results, user" /></div><button className="btn">Filter</button></form>
      <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th>Detail</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td data-label="When">{dateTime(r.created_at)}</td><td data-label="Who">{r.actor ?? "System"}</td><td data-label="Action"><code>{r.action}</code></td><td data-label="Record">{r.entity} {r.entity_id}</td><td data-label="Detail">{r.detail ?? ""}</td></tr>)}</tbody></table></div>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 25))} base="/portal/admin/audit" params={{ q }} />
    </>
  );
}
