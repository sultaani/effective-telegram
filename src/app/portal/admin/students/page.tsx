import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "../../../../lib/auth";
import { listStudents } from "../../../../services/users";
import { listProgrammes } from "../../../../services/academics";
import { Empty, Pagination, pageNum, str } from "../../../../components/bits";

export const metadata: Metadata = { title: "Students" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("students:read");
  const sp = await searchParams; const q = str(sp.q), programme = Number(str(sp.programme)) || undefined, level = Number(str(sp.level)) || undefined, page = pageNum(sp.page);
  const { rows, total, pages } = listStudents({ q, programme, level, page });
  const qs = new URLSearchParams(Object.entries({ q, programme: programme?.toString(), level: level?.toString() }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <div className="row between"><h1>Students</h1><Link className="btn secondary small" href={`/portal/admin/export/students?${qs}`}>Export CSV</Link></div>
      <form className="filters" role="search"><div className="field"><label htmlFor="q">Search name or matric number</label><input id="q" name="q" type="search" defaultValue={q} /></div>
        <div className="field"><label htmlFor="programme">Programme</label><select id="programme" name="programme" defaultValue={programme ?? ""}><option value="">All</option>{listProgrammes({ includeInactive: true }).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
        <div className="field"><label htmlFor="level">Level</label><select id="level" name="level" defaultValue={level ?? ""}><option value="">All</option><option>100</option><option>200</option><option>300</option></select></div>
        <button className="btn">Filter</button></form>
      <p className="muted" aria-live="polite">{total} students</p>
      {rows.length === 0 ? <Empty title="No students match" /> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Matric no.</th><th>Name</th><th>Programme</th><th className="num">Level</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td data-label="Matric no.">{r.matric_no}</td><td data-label="Name">{r.name}<br /><span className="small muted">{r.email}</span></td><td data-label="Programme">{r.programme}</td><td data-label="Level" className="num">{r.level}</td></tr>)}</tbody></table></div>
      )}
      <Pagination page={page} pages={pages} base="/portal/admin/students" params={{ q, programme: programme?.toString(), level: level?.toString() }} />
    </>
  );
}
