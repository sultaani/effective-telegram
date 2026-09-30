import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { all } from "../../../../db";
import { currentSemester } from "../../../../services/academics";
import { Empty, StatusBadge } from "../../../../components/bits";

export const metadata: Metadata = { title: "Registered courses" };

export default async function Page() {
  const s = await requireSession(["STUDENT"]);
  const sem = await currentSemester();
  const rows = sem ? await all<{ code: string; title: string; units: number; status: string; lecturer: string | null }>(
    `SELECT c.code,c.title,c.units,r.status,
      (SELECT st.display_name FROM allocations a JOIN staff st ON st.id=a.staff_id WHERE a.course_id=c.id AND a.semester_id=r.semester_id LIMIT 1) lecturer
     FROM registrations r JOIN courses c ON c.id=r.course_id WHERE r.student_id=? AND r.semester_id=? ORDER BY c.code`, s.actor.studentId, sem.id) : [];
  return (
    <>
      <h1>Registered courses</h1>
      <p className="muted">{sem?.label}</p>
      {rows.length === 0 ? <Empty title="No courses registered yet">Start on the course registration page.</Empty> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Code</th><th>Course</th><th>Lecturer</th><th>Status</th><th className="num">Units</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.code}><td data-label="Code">{r.code}</td><td data-label="Course">{r.title}</td><td data-label="Lecturer">{r.lecturer ?? "To be assigned"}</td><td data-label="Status"><StatusBadge status={r.status} /></td><td data-label="Units" className="num">{r.units}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={4}><strong>Total units</strong></td><td className="num"><strong>{rows.reduce((a, r) => a + r.units, 0)}</strong></td></tr></tfoot></table></div>
      )}
    </>
  );
}
