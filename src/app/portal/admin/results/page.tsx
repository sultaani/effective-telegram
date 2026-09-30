import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { approvalQueue } from "../../../../services/results";
import { publishAction } from "../../../actions/admin";
import { Empty } from "../../../../components/bits";

export const metadata: Metadata = { title: "Results publication" };

export default async function Page() {
  const s = await requirePermission("results:publish");
  const rows = await approvalQueue(s.actor, "HOD_APPROVED");
  return (
    <>
      <h1>Results publication</h1><p className="muted">Courses approved by the Head of Department. Publishing makes results visible to students and notifies them.</p>
      {rows.length === 0 ? <Empty title="Nothing to publish">Approved courses will appear here.</Empty> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Course</th><th>Department</th><th>Lecturer</th><th className="num">Students</th><th></th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={`${r.course_id}-${r.semester_id}`}><td data-label="Course"><strong>{r.code}</strong> {r.title}</td><td data-label="Department">{r.department}</td><td data-label="Lecturer">{r.lecturer ?? "–"}</td><td data-label="Students" className="num">{r.n}</td>
              <td data-label=""><form action={publishAction}><input type="hidden" name="course" value={r.course_id} /><input type="hidden" name="semester" value={r.semester_id} /><button className="btn small">Publish results</button></form></td></tr>))}</tbody></table></div>
      )}
    </>
  );
}
