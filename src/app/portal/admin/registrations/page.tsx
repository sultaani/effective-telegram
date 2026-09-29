import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { pendingRegistrations } from "../../../../services/registration";
import { registrationDecision } from "../../../actions/admin";
import { Empty } from "../../../../components/bits";

export const metadata: Metadata = { title: "Course registrations" };

export default async function Page() {
  await requirePermission("registration:approve");
  const rows = pendingRegistrations();
  return (
    <>
      <h1>Course registrations</h1><p className="muted">Submitted registrations for the current semester.</p>
      {rows.length === 0 ? <Empty title="No registrations are waiting">You are up to date.</Empty> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Student</th><th>Programme</th><th className="num">Level</th><th className="num">Courses</th><th className="num">Units</th><th>Decision</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.student_id}><td data-label="Student">{r.name}<br /><span className="small muted">{r.matric_no}</span></td><td data-label="Programme">{r.programme}</td><td data-label="Level" className="num">{r.level}</td><td data-label="Courses" className="num">{r.courses}</td><td data-label="Units" className="num">{r.units}</td>
              <td data-label="Decision"><form action={registrationDecision} className="row" style={{ justifyContent: "flex-end" }}><input type="hidden" name="student" value={r.student_id} />
                <button name="decision" value="approve" className="btn small">Approve</button><button name="decision" value="reject" className="btn small secondary">Return</button></form></td></tr>))}</tbody></table></div>
      )}
    </>
  );
}
