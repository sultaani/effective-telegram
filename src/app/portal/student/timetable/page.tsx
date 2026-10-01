import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { all } from "../../../../db";
import { allSemesters, currentSemester } from "../../../../services/academics";
import { Empty } from "../../../../components/bits";
import { PrintButton } from "../../../../components/Interactive";
import { dateOnly } from "../../../../lib/format";

export const metadata: Metadata = { title: "Timetable and calendar" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default async function Page() {
  const s = await requireSession(["STUDENT"]);
  const sem = await currentSemester();
  const rows = sem ? await all<{ kind: string; day: string | null; exam_date: string | null; start_time: string; end_time: string; venue: string; code: string; title: string }>(
    `SELECT t.kind,t.day,t.exam_date,t.start_time,t.end_time,t.venue,c.code,c.title FROM timetable t JOIN courses c ON c.id=t.course_id
     JOIN registrations r ON r.course_id=c.id AND r.semester_id=t.semester_id AND r.student_id=? AND r.status='APPROVED' WHERE t.semester_id=? ORDER BY t.start_time`, s.actor.studentId, sem.id) : [];
  const cls = rows.filter((r) => r.kind === "CLASS"), exams = rows.filter((r) => r.kind === "EXAM").sort((a, b) => (a.exam_date ?? "").localeCompare(b.exam_date ?? ""));
  return (
    <>
      <div className="row between"><h1>Timetable and calendar</h1><PrintButton label="Print timetable" /></div>
      <p className="muted">Shown for your approved courses in {sem?.label}.</p>
      <div className="panel"><h2>Weekly class timetable</h2>
        {cls.length === 0 ? <Empty title="No classes to show">Your timetable appears after your course registration is approved.</Empty> : DAYS.map((d) => {
          const day = cls.filter((c) => c.day === d);
          return day.length ? <div key={d} style={{ marginBottom: "16px" }}><h3>{d}</h3>{day.map((c) => <p key={c.code} style={{ margin: "0 0 8px" }}><strong>{c.start_time}–{c.end_time}</strong> · {c.code} {c.title} · {c.venue}</p>)}</div> : null;
        })}</div>
      <div className="panel"><h2>Examination timetable</h2>
        {exams.length === 0 ? <Empty title="No examinations scheduled yet" /> : (
          <div className="table-wrap"><table className="table stack-sm"><thead><tr><th>Date</th><th>Time</th><th>Course</th><th>Venue</th></tr></thead>
            <tbody>{exams.map((e) => <tr key={e.code}><td data-label="Date">{e.exam_date}</td><td data-label="Time">{e.start_time}–{e.end_time}</td><td data-label="Course">{e.code} {e.title}</td><td data-label="Venue">{e.venue}</td></tr>)}</tbody></table></div>
        )}</div>
      <div className="panel"><h2>Academic calendar</h2>
        {sem && <ul style={{ margin: 0, paddingLeft: "1.2rem" }}><li>Current: {sem.label}</li><li>Course registration opens: {dateOnly(sem.reg_opens)}</li><li>Course registration closes: {dateOnly(sem.reg_closes)}</li></ul>}
        <p className="small muted" style={{ marginBottom: 0 }}>Sessions on record: {(await allSemesters()).length} semesters. Demo dates; the college&apos;s official calendar is published under Downloads.</p></div>
    </>
  );
}
