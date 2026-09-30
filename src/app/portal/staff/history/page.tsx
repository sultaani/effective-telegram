import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { all } from "../../../../db";
import { Empty, StatusBadge } from "../../../../components/bits";

export const metadata: Metadata = { title: "Result history" };

export default async function Page() {
  const s = await requireSession(["LECTURER", "HOD", "DEAN"]);
  const rows = s.actor.staffId ? await all<{ label: string; code: string; title: string; n: number; status: string; avg: number }>(
    `SELECT a.label || ' · ' || CASE sm.number WHEN 1 THEN 'First' ELSE 'Second' END || ' semester' label, c.code, c.title, COUNT(*) n, x.status, ROUND(AVG(x.total)::numeric,1) avg
     FROM allocations al JOIN courses c ON c.id=al.course_id JOIN semesters sm ON sm.id=al.semester_id JOIN academic_sessions a ON a.id=sm.session_id
     JOIN registrations r ON r.course_id=c.id AND r.semester_id=sm.id JOIN results x ON x.registration_id=r.id
     WHERE al.staff_id=? GROUP BY sm.id, sm.number, a.label, c.id, c.code, c.title, x.status ORDER BY a.label DESC, sm.number DESC, c.code`, s.actor.staffId) : [];
  return (
    <>
      <h1>Result history</h1>
      {rows.length === 0 ? <Empty title="No results recorded yet" /> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Semester</th><th>Course</th><th className="num">Students</th><th className="num">Average</th><th>Status</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td data-label="Semester">{r.label}</td><td data-label="Course">{r.code} {r.title}</td><td data-label="Students" className="num">{r.n}</td><td data-label="Average" className="num">{r.avg}</td><td data-label="Status"><StatusBadge status={r.status} /></td></tr>)}</tbody></table></div>
      )}
    </>
  );
}
