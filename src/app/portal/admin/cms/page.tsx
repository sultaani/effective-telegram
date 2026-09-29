import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/auth";
import { CONTENT_TYPES, listAdmin, STATUSES } from "../../../../services/cms";
import { Empty, Pagination, StatusBadge, pageNum, str } from "../../../../components/bits";
import { dateOnly } from "../../../../lib/format";

export const metadata: Metadata = { title: "Website content" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("cms:draft");
  const sp = await searchParams; const type = str(sp.type), status = str(sp.status), q = str(sp.q), page = pageNum(sp.page);
  const { rows, total, pages } = listAdmin({ type, status, q, page });
  return (
    <>
      <h1>Website content</h1>
      <div className="row" style={{ marginBottom: "var(--space-4)" }}>{CONTENT_TYPES.map((t) => <Link key={t} className="btn small secondary" href={`/portal/admin/cms/new?type=${t}`}>New {t}</Link>)}</div>
      <form className="filters" role="search"><div className="field"><label htmlFor="q">Search titles</label><input id="q" name="q" type="search" defaultValue={q} /></div>
        <div className="field"><label htmlFor="type">Type</label><select id="type" name="type" defaultValue={type ?? ""}><option value="">All</option>{CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="field"><label htmlFor="status">Status</label><select id="status" name="status" defaultValue={status ?? ""}><option value="">All</option>{STATUSES.map((t) => <option key={t}>{t}</option>)}</select></div><button className="btn">Filter</button></form>
      <p className="muted" aria-live="polite">{total} items</p>
      {rows.length === 0 ? <Empty title="No content matches" /> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Accuracy</th><th>Updated</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td data-label="Title"><Link href={`/portal/admin/cms/${r.id}`}><strong>{r.title}</strong></Link></td><td data-label="Type">{r.type}</td><td data-label="Status"><StatusBadge status={r.status} /></td><td data-label="Accuracy"><StatusBadge status={r.verification} /></td><td data-label="Updated">{dateOnly(r.updated_at)}</td></tr>)}</tbody></table></div>
      )}
      <Pagination page={page} pages={pages} base="/portal/admin/cms" params={{ q, type, status }} />
    </>
  );
}
