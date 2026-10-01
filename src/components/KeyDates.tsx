import { one } from "../db";
import { currentSemester } from "../services/academics";
import { dateOnly } from "../lib/format";

const DAY = 86400000;
function soon(ms: number | null) { return ms != null && ms - Date.now() < 7 * DAY && ms - Date.now() > -DAY; }

/** Registration deadline, next examination and next fee due date: always visible on dashboards. */
export async function KeyDates({ studentId }: { studentId?: number }) {
  const sem = await currentSemester();
  if (!sem) return null;
  const today = new Date().toISOString().slice(0, 10);
  const exam = await one<{ d: string | null }>("SELECT MIN(exam_date) d FROM timetable WHERE kind='EXAM' AND semester_id=? AND exam_date>=?", sem.id, today);
  const due = studentId ? await one<{ d: string | null }>(
    `SELECT MIN(i.due_date) d FROM invoices i WHERE i.student_id=? AND i.due_date IS NOT NULL
     AND i.amount_kobo > COALESCE((SELECT SUM(p.amount_kobo) FROM payments p WHERE p.invoice_id=i.id AND p.status='SUCCESSFUL'),0)`, studentId) : undefined;
  const items: { label: string; ms: number | null; text: string }[] = [
    { label: "Course registration closes", ms: sem.reg_closes, text: dateOnly(sem.reg_closes) },
  ];
  if (exam?.d) items.push({ label: "Next examination", ms: Date.parse(exam.d), text: dateOnly(Date.parse(exam.d)) });
  if (due?.d) items.push({ label: "Fees due", ms: Date.parse(due.d), text: dateOnly(Date.parse(due.d)) });
  return (
    <section className="panel keydates" aria-labelledby="kd-h">
      <h2 id="kd-h">Key dates · {sem.label}</h2>
      <ul>{items.map((i) => <li key={i.label} className={soon(i.ms) ? "soon" : undefined}><strong>{i.text}</strong><span>{i.label}{soon(i.ms) ? " · coming up this week" : ""}</span></li>)}</ul>
    </section>
  );
}
