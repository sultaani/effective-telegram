import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { all, one } from "../../../../db";

export const metadata: Metadata = { title: "Reports" };

export default async function Page() {
  await requirePermission("reports:view");
  const byProg = all<{ programme: string; level: number; n: number }>("SELECT p.title programme, s.level, COUNT(*) n FROM students s JOIN programmes p ON p.id=s.programme_id GROUP BY p.id, s.level ORDER BY p.title, s.level");
  const grades = all<{ grade: string; n: number }>("SELECT grade, COUNT(*) n FROM results WHERE status='PUBLISHED' GROUP BY grade ORDER BY grade");
  const totalStudents = one<{ n: number }>("SELECT COUNT(*) n FROM students")!.n;
  const max = Math.max(1, ...grades.map((g) => g.n));
  return (
    <>
      <h1>Reports</h1>
      <div className="grid cols-2">
        <div className="panel"><h2>Students by programme and level</h2><p className="muted">{totalStudents} students in total.</p>
          <div className="table-wrap"><table className="table"><thead><tr><th>Programme</th><th className="num">Level</th><th className="num">Students</th></tr></thead><tbody>{byProg.map((r, i) => <tr key={i}><td>{r.programme}</td><td className="num">{r.level}</td><td className="num">{r.n}</td></tr>)}</tbody></table></div></div>
        <div className="panel"><h2>Published grade distribution</h2>
          {grades.length === 0 ? <p className="muted">No published results yet.</p> : grades.map((g) => (
            <div key={g.grade} className="row" style={{ marginBottom: 6 }}><span style={{ width: 24, fontWeight: 700 }}>{g.grade}</span>
              <div style={{ flex: 1, background: "var(--portal-primary-tint)", height: 18 }} role="img" aria-label={`Grade ${g.grade}: ${g.n} results`}><div style={{ width: `${(g.n / max) * 100}%`, background: "var(--portal-primary)", height: "100%" }} /></div><span style={{ width: 40, textAlign: "right" }}>{g.n}</span></div>))}</div>
      </div>
    </>
  );
}
