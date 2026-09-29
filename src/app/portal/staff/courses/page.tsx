import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "../../../../lib/auth";
import { assignedCourses } from "../../../../services/results";
import { currentSemester } from "../../../../services/academics";
import { Empty } from "../../../../components/bits";

export const metadata: Metadata = { title: "My courses" };

export default async function Page() {
  const s = await requireSession(["LECTURER", "HOD", "DEAN"]);
  const sem = currentSemester();
  const courses = sem && s.actor.staffId ? assignedCourses(s.actor.staffId, sem.id) : [];
  return (
    <>
      <h1>My courses and scores</h1><p className="muted">{sem?.label}</p>
      {courses.length === 0 ? <Empty title="No courses assigned" /> : (
        <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Course</th><th>Programme</th><th className="num">Level</th><th className="num">Students</th><th>Progress</th><th></th></tr></thead>
          <tbody>{courses.map((c) => (
            <tr key={c.course_id}><td data-label="Course"><strong>{c.code}</strong> {c.title}</td><td data-label="Programme">{c.programme}</td><td data-label="Level" className="num">{c.level}</td><td data-label="Students" className="num">{c.students}</td>
              <td data-label="Progress">{c.submitted ? <span className="badge info">Submitted ({c.submitted})</span> : c.draft ? <span className="badge warn">Draft ({c.draft})</span> : <span className="badge neutral">Not started</span>}</td>
              <td data-label=""><Link className="btn small secondary" href={`/portal/staff/courses/${c.course_id}`}>Open</Link></td></tr>))}</tbody></table></div>
      )}
    </>
  );
}
