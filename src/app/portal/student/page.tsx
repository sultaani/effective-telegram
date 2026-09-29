import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "../../../lib/auth";
import { all, one } from "../../../db";
import { registrationView } from "../../../services/registration";
import { outstanding } from "../../../services/fees";
import { studentResults } from "../../../services/results";
import { listPublished } from "../../../services/cms";
import { naira, dateTime } from "../../../lib/format";
import { StatusBadge, Alert } from "../../../components/bits";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentHome() {
  const s = await requireSession(["STUDENT"]);
  const sid = s.actor.studentId!;
  const st = one<{ matric_no: string; level: number; programme: string }>("SELECT s.matric_no,s.level,p.title programme FROM students s JOIN programmes p ON p.id=s.programme_id WHERE s.id=?", sid)!;
  const reg = registrationView(sid);
  const owed = outstanding(sid);
  const res = studentResults(sid);
  const notes = all<{ id: number; title: string; created_at: number }>("SELECT id,title,created_at FROM notifications WHERE user_id=? AND read_at IS NULL ORDER BY id DESC LIMIT 4", s.user.id);
  const notices = listPublished("announcement", { limit: 3, audience: "students" });
  const todo: React.ReactNode[] = [];
  if (reg && reg.status === "NOT_STARTED" || reg?.status === "DRAFT") todo.push(<li key="r"><Link href="/portal/student/registration">Register your courses</Link>{reg.open ? "" : " (registration is closed)"}</li>);
  if (reg?.status === "REJECTED") todo.push(<li key="rr"><Link href="/portal/student/registration">Your registration was returned. Review and resubmit.</Link></li>);
  if (owed > 0) todo.push(<li key="f"><Link href="/portal/student/fees">Pay outstanding fees: {naira(owed)}</Link></li>);
  return (
    <>
      <h1>Welcome, {s.user.name.split(" ")[0]}</h1>
      <p className="muted">{st.programme} · {st.level} level · {st.matric_no}</p>
      <div className="panel"><h2>What needs your attention</h2>
        {todo.length ? <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>{todo}</ul> : <p style={{ margin: 0 }}>Nothing is waiting for you. You are up to date.</p>}</div>
      <div className="grid cols-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{res.semesters.length ? res.cgpa.toFixed(2) : "–"}</div><div className="l">Current CGPA</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(owed)}</div><div className="l">Outstanding fees</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{reg ? <StatusBadge status={reg.status} /> : "–"}</div><div className="l">{reg?.semester.label ?? "Registration"}</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{res.totalUnits}</div><div className="l">Units passed and published</div></div>
      </div>
      <div className="grid cols-2">
        <div className="panel"><h2>Unread notifications</h2>
          {notes.length === 0 ? <p className="muted" style={{ margin: 0 }}>No new notifications.</p> : <ul style={{ paddingLeft: "1.2rem", margin: 0 }}>{notes.map((n) => <li key={n.id}>{n.title} <span className="small muted">{dateTime(n.created_at)}</span></li>)}</ul>}
          <p style={{ margin: "var(--space-3) 0 0" }}><Link href="/portal/student/notifications">All notifications</Link></p></div>
        <div className="panel"><h2>Announcements</h2>
          {notices.length === 0 ? <p className="muted" style={{ margin: 0 }}>No announcements.</p> : notices.map((n) => <p key={n.id}><strong>{n.title}</strong><br /><span className="small muted">{n.summary}</span></p>)}</div>
      </div>
      {reg && !reg.open && <Alert kind="warn" title="Registration closed">Course registration for this semester is closed. Contact the Registrar's office if you need help.</Alert>}
    </>
  );
}
