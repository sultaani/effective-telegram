import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { approvalQueue } from "../../../../services/results";
import { decideAction } from "../../../actions/staff";
import { Empty } from "../../../../components/bits";

export const metadata: Metadata = { title: "Result approvals" };

export default async function Page() {
  const s = await requireSession(["HOD", "DEAN"]);
  const queue = await approvalQueue(s.actor, "SUBMITTED");
  return (
    <>
      <h1>Result approvals</h1>
      <p className="muted">Results submitted by lecturers in your department. Approving sends them to the Examinations Office for publication.</p>
      {queue.length === 0 ? <Empty title="Nothing to approve">Submitted results will appear here.</Empty> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Course</th><th>Department</th><th>Lecturer</th><th className="num">Students</th><th>Decision</th></tr></thead>
          <tbody>{queue.map((q) => (
            <tr key={`${q.course_id}-${q.semester_id}`}><td data-label="Course"><strong>{q.code}</strong> {q.title}</td><td data-label="Department">{q.department}</td><td data-label="Lecturer">{q.lecturer ?? "–"}</td><td data-label="Students" className="num">{q.n}</td>
              <td data-label="Decision"><form action={decideAction} className="row" style={{ justifyContent: "flex-end" }}>
                <input type="hidden" name="course" value={q.course_id} /><input type="hidden" name="semester" value={q.semester_id} />
                <button name="decision" value="approve" className="btn small">Approve</button><button name="decision" value="return" className="btn small secondary">Return to lecturer</button></form></td></tr>))}</tbody></table></div>
      )}
    </>
  );
}
