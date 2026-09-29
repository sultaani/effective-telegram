import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "../../../lib/auth";
import { assignedCourses, approvalQueue } from "../../../services/results";
import { currentSemester } from "../../../services/academics";
import { listPublished } from "../../../services/cms";
import { Empty } from "../../../components/bits";

export const metadata: Metadata = { title: "Staff dashboard" };

export default async function Page() {
  const s = await requireSession(["LECTURER", "HOD", "DEAN"]);
  const sem = currentSemester();
  const courses = sem && s.actor.staffId ? assignedCourses(s.actor.staffId, sem.id) : [];
  const isApprover = s.actor.roles.some((r) => r === "HOD" || r === "DEAN");
  const queue = isApprover ? approvalQueue(s.actor, "SUBMITTED") : [];
  const needScores = courses.filter((c) => c.students > c.draft + c.submitted);
  const notices = listPublished("announcement", { limit: 3, audience: "staff" });
  return (
    <>
      <h1>Welcome, {s.user.name}</h1>
      <p className="muted">{sem?.label}</p>
      <div className="panel"><h2>What needs your attention</h2>
        <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
          {needScores.map((c) => <li key={c.course_id}><Link href={`/portal/staff/courses/${c.course_id}`}>{c.code}: {c.students - c.draft - c.submitted} students still need scores</Link></li>)}
          {queue.map((q) => <li key={q.course_id}><Link href="/portal/staff/approvals">{q.code}: results from {q.lecturer ?? "a lecturer"} await your approval ({q.n} students)</Link></li>)}
          {!needScores.length && !queue.length && <li>Nothing is waiting for you.</li>}
        </ul></div>
      <div className="grid cols-2">
        <div className="panel"><h2>Courses this semester</h2>
          {courses.length === 0 ? <Empty title="No courses assigned">Your Head of Department assigns courses each semester.</Empty> :
            courses.map((c) => <p key={c.course_id}><Link href={`/portal/staff/courses/${c.course_id}`}><strong>{c.code}</strong> {c.title}</Link><br /><span className="small muted">{c.students} students · {c.level} level</span></p>)}</div>
        <div className="panel"><h2>Staff announcements</h2>{notices.length === 0 ? <p className="muted" style={{ margin: 0 }}>None.</p> : notices.map((n) => <p key={n.id}><strong>{n.title}</strong><br /><span className="small muted">{n.summary}</span></p>)}</div>
      </div>
    </>
  );
}
