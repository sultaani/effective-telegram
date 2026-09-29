import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/auth";
import { can } from "../../../../lib/permissions";
import { adminPayments, feeSummary } from "../../../../services/fees";
import { allSemesters, listProgrammes } from "../../../../services/academics";
import { InvoiceForm } from "../../../../components/AdminForms";
import { Empty, Pagination, StatusBadge, pageNum, str } from "../../../../components/bits";
import { naira, dateTime } from "../../../../lib/format";

export const metadata: Metadata = { title: "Fees and payments" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePermission("fees:manage");
  const sp = await searchParams; const q = str(sp.q), status = str(sp.status), page = pageNum(sp.page);
  const sum = feeSummary();
  const { rows, total, pages } = adminPayments({ q, status, page });
  const qs = new URLSearchParams(Object.entries({ q, status }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <h1>Fees and payments</h1>
      <div className="grid cols-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(sum.charged)}</div><div className="l">Charged</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(sum.paid)}</div><div className="l">Collected (verified)</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(sum.charged - sum.paid)}</div><div className="l">Outstanding</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{sum.pending}</div><div className="l">Pending confirmation</div></div>
      </div>
      {can(s.actor, "fees:manage") && <div className="panel"><h2>Charge fees</h2><InvoiceForm semesters={allSemesters().map((x) => ({ id: x.id, label: x.label }))} programmes={listProgrammes({ includeInactive: true }).map((p) => ({ id: p.id, label: p.title }))} /></div>}
      <div className="row between"><h2 style={{ margin: 0 }}>Payments</h2><Link className="btn secondary small" href={`/portal/admin/export/payments?${qs}`}>Export CSV</Link></div>
      <form className="filters" role="search" style={{ marginTop: "var(--space-3)" }}><div className="field"><label htmlFor="q">Search name, matric or reference</label><input id="q" name="q" type="search" defaultValue={q} /></div>
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status ?? ""}><option value="">All</option><option value="SUCCESSFUL">Paid</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option></select></div><button className="btn">Filter</button></form>
      <p className="muted" aria-live="polite">{total} payments</p>
      {rows.length === 0 ? <Empty title="No payments match" /> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Date</th><th>Student</th><th>For</th><th>Reference</th><th className="num">Amount</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.reference}><td data-label="Date">{dateTime(r.paid_at ?? r.created_at)}</td><td data-label="Student">{r.name}<br /><span className="small muted">{r.matric_no}</span></td><td data-label="For">{r.description}</td><td data-label="Reference"><code>{r.reference}</code></td><td data-label="Amount" className="num">{naira(r.amount_kobo)}</td><td data-label="Status"><StatusBadge status={r.status} /></td></tr>)}</tbody></table></div>
      )}
      <Pagination page={page} pages={pages} base="/portal/admin/fees" params={{ q, status }} />
    </>
  );
}
