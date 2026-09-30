import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { one } from "../../../../db";

export const metadata: Metadata = { title: "Profile" };

export default async function Page() {
  const s = await requireSession(["STUDENT"]);
  const p = (await one<{ matric_no: string; level: number; programme: string; department: string; school: string; entry: string }>(
    `SELECT s.matric_no,s.level,p.title programme,d.name department,sc.name school,a.label entry FROM students s JOIN programmes p ON p.id=s.programme_id
     JOIN departments d ON d.id=p.department_id JOIN schools sc ON sc.id=d.school_id JOIN academic_sessions a ON a.id=s.entry_session_id WHERE s.id=?`, s.actor.studentId))!;
  const rows: [string, string][] = [["Name", s.user.name], ["Email", s.user.email], ["Matriculation number", p.matric_no], ["Programme", p.programme], ["Department", p.department], ["School", p.school], ["Current level", `${p.level} level`], ["Entry session", p.entry]];
  return (
    <>
      <h1>Profile</h1>
      <div className="panel" style={{ maxWidth: 640 }}><table className="table"><tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row" style={{ width: "40%" }}>{k}</th><td>{v}</td></tr>)}</tbody></table>
        <p className="small muted" style={{ marginBottom: 0 }}>To correct any detail, open a request under Support. Academic records are changed only by the Registrar.</p></div>
    </>
  );
}
