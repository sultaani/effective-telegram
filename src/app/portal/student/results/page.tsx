import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { studentResults } from "../../../../services/results";
import { Empty } from "../../../../components/bits";
import { PrintButton } from "../../../../components/Interactive";
import { isPass, remarkFor } from "../../../../lib/grading";

export const metadata: Metadata = { title: "Results and GPA" };

export default async function Page() {
  const s = await requireSession(["STUDENT"]);
  const r = await studentResults(s.actor.studentId!); // student id comes from the session, never from the URL
  return (
    <>
      <div className="row between"><h1>Results and GPA</h1>{r.semesters.length > 0 && <PrintButton label="Print results" />}</div>
      {r.semesters.length === 0 ? <Empty title="No published results yet">Results appear here after the Examinations Office publishes them.</Empty> : (
        <>
          <div className="panel stat"><div className="v">{r.cgpa.toFixed(2)}</div><div className="l">Cumulative GPA on a 5.0 scale · {r.totalUnits} units</div></div>
          {[...r.semesters].reverse().map((sem) => (
            <div className="panel" key={sem.label}>
              <h2>{sem.label}</h2>
              <div className="table-wrap"><table className="table stack-sm"><thead><tr><th>Code</th><th>Course</th><th className="num">Units</th><th className="num">CA</th><th className="num">Exam</th><th className="num">Total</th><th>Grade</th><th>Remark</th></tr></thead>
                <tbody>{sem.rows.map((x) => <tr key={x.code}><td data-label="Code" className="mono">{x.code}</td><td data-label="Course">{x.title}</td><td data-label="Units" className="num">{x.units}</td><td data-label="CA" className="num">{x.ca}</td><td data-label="Exam" className="num">{x.exam}</td><td data-label="Total" className="num">{x.total}</td><td data-label="Grade"><span className={`gradebox ${isPass(x.grade) ? "pass" : "fail"}`}>{x.grade}</span></td><td data-label="Remark">{remarkFor(x.grade)}</td></tr>)}</tbody></table></div>
              <p style={{ margin: "12px 0 0" }}><strong>Semester GPA {sem.gpa.toFixed(2)}</strong> · Cumulative GPA {sem.cgpa.toFixed(2)} · {sem.units} units</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
