import { all, one, run, tx } from "../db";
import { audit } from "../lib/audit";
import { notify } from "../lib/notify";
import { gpa, gradeFor, validateScores } from "../lib/grading";
import { type Actor, can } from "../lib/permissions";
import { currentSemester } from "./academics";
import type { Result } from "./cms";

export interface AssignedCourse { course_id: number; code: string; title: string; units: number; level: number; programme: string; department_id: number; semester_id: number; students: number; draft: number; submitted: number }

export const assignedCourses = (staffId: number, semesterId: number) => all<AssignedCourse>(
  `SELECT c.id course_id,c.code,c.title,c.units,c.level,p.title programme,p.department_id,a.semester_id,
    (SELECT COUNT(*) FROM registrations r WHERE r.course_id=c.id AND r.semester_id=a.semester_id AND r.status='APPROVED') students,
    (SELECT COUNT(*) FROM results x JOIN registrations r ON r.id=x.registration_id WHERE r.course_id=c.id AND r.semester_id=a.semester_id AND x.status='DRAFT') draft,
    (SELECT COUNT(*) FROM results x JOIN registrations r ON r.id=x.registration_id WHERE r.course_id=c.id AND r.semester_id=a.semester_id AND x.status IN ('SUBMITTED','HOD_APPROVED','PUBLISHED')) submitted
   FROM allocations a JOIN courses c ON c.id=a.course_id JOIN programmes p ON p.id=c.programme_id
   WHERE a.staff_id=? AND a.semester_id=? ORDER BY c.code`, staffId, semesterId);

export const isAllocated = async (staffId: number, courseId: number, semesterId: number) =>
  !!(await one("SELECT 1 AS x FROM allocations WHERE staff_id=? AND course_id=? AND semester_id=?", staffId, courseId, semesterId));

export interface ClassRow { registration_id: number; matric_no: string; name: string; ca: number | null; exam: number | null; total: number | null; grade: string | null; status: string | null }

/** Class list is only returned to the lecturer allocated to the course (prevents IDOR via course id). */
export async function classList(actor: Actor, courseId: number, semesterId: number): Promise<ClassRow[] | null> {
  if (!actor.staffId || !(await isAllocated(actor.staffId, courseId, semesterId))) return null;
  return all<ClassRow>(
    `SELECT r.id registration_id, s.matric_no, u.name, x.ca, x.exam, x.total, x.grade, x.status
     FROM registrations r JOIN students s ON s.id=r.student_id JOIN users u ON u.id=s.user_id LEFT JOIN results x ON x.registration_id=r.id
     WHERE r.course_id=? AND r.semester_id=? AND r.status='APPROVED' ORDER BY s.matric_no`, courseId, semesterId);
}

export async function saveScores(actor: Actor, rows: { registrationId: number; ca: number | null; exam: number | null }[]): Promise<Result<number>> {
  if (!can(actor, "results:enter") || !actor.staffId) return { ok: false, error: "You cannot enter results." };
  let saved = 0;
  const problems: string[] = [];
  await tx(async () => {
    for (const r of rows) {
      if (r.ca == null && r.exam == null) continue;
      const reg = await one<{ course_id: number; semester_id: number; matric_no: string }>(
        "SELECT r.course_id, r.semester_id, s.matric_no FROM registrations r JOIN students s ON s.id=r.student_id WHERE r.id=? AND r.status='APPROVED'", r.registrationId);
      if (!reg || !(await isAllocated(actor.staffId!, reg.course_id, reg.semester_id))) { problems.push("One row is not in a course you teach."); continue; }
      const cur = await one<{ status: string }>("SELECT status FROM results WHERE registration_id=?", r.registrationId);
      if (cur && cur.status !== "DRAFT") { problems.push(`${reg.matric_no}: already submitted.`); continue; }
      const ca = r.ca ?? 0, exam = r.exam ?? 0;
      const bad = validateScores(ca, exam);
      if (bad) { problems.push(`${reg.matric_no}: ${bad}`); continue; }
      const total = ca + exam, g = gradeFor(total);
      await run(`INSERT INTO results(registration_id,ca,exam,total,grade,points,status,entered_by,updated_at) VALUES(?,?,?,?,?,?,'DRAFT',?,?)
           ON CONFLICT(registration_id) DO UPDATE SET ca=EXCLUDED.ca, exam=EXCLUDED.exam, total=EXCLUDED.total, grade=EXCLUDED.grade, points=EXCLUDED.points, entered_by=EXCLUDED.entered_by, updated_at=EXCLUDED.updated_at`,
        r.registrationId, ca, exam, total, g.grade, g.points, actor.userId, Date.now());
      saved++;
    }
  });
  if (problems.length) return { ok: false, error: problems.slice(0, 3).join(" ") };
  await audit(actor.userId, "results.save", "results", undefined, `${saved} rows`);
  return { ok: true, value: saved };
}

export async function submitCourseResults(actor: Actor, courseId: number, semesterId: number): Promise<Result<number>> {
  if (!actor.staffId || !(await isAllocated(actor.staffId, courseId, semesterId))) return { ok: false, error: "You do not teach this course." };
  const total = (await one<{ n: number }>("SELECT COUNT(*) n FROM registrations WHERE course_id=? AND semester_id=? AND status='APPROVED'", courseId, semesterId))!.n;
  const scored = (await one<{ n: number }>(`SELECT COUNT(*) n FROM results x JOIN registrations r ON r.id=x.registration_id
      WHERE r.course_id=? AND r.semester_id=? AND x.status='DRAFT' AND x.total IS NOT NULL`, courseId, semesterId))!.n;
  if (scored === 0) return { ok: false, error: "There are no saved scores to submit." };
  const already = (await one<{ n: number }>(`SELECT COUNT(*) n FROM results x JOIN registrations r ON r.id=x.registration_id
      WHERE r.course_id=? AND r.semester_id=? AND x.status<>'DRAFT'`, courseId, semesterId))!.n;
  if (scored + already < total) return { ok: false, error: `Scores are missing for ${total - scored - already} student(s). Enter or save all scores first.` };
  const r = await run(`UPDATE results SET status='SUBMITTED', updated_at=? WHERE status='DRAFT' AND registration_id IN
      (SELECT id FROM registrations WHERE course_id=? AND semester_id=?)`, Date.now(), courseId, semesterId);
  await audit(actor.userId, "results.submit", "course", courseId, `${r.changes} rows`);
  return { ok: true, value: r.changes };
}

/** Departments an approver may act on: HOD = own department; DEAN = all departments in own school. */
async function approvableDepartments(actor: Actor): Promise<number[]> {
  const ids = new Set<number>();
  if (actor.roles.includes("HOD")) actor.departmentIds.forEach((d) => ids.add(d));
  if (actor.roles.includes("DEAN"))
    for (const d of actor.departmentIds)
      (await all<{ id: number }>("SELECT id FROM departments WHERE school_id=(SELECT school_id FROM departments WHERE id=?)", d)).forEach((x) => ids.add(x.id));
  return [...ids];
}

export interface QueueRow { course_id: number; semester_id: number; code: string; title: string; department: string; lecturer: string | null; n: number }

export async function approvalQueue(actor: Actor, status: "SUBMITTED" | "HOD_APPROVED"): Promise<QueueRow[]> {
  const scope = status === "SUBMITTED" ? await approvableDepartments(actor) : null;
  if (status === "SUBMITTED" && (!can(actor, "results:approve") || !scope!.length)) return [];
  if (status === "HOD_APPROVED" && !can(actor, "results:publish")) return [];
  const filter = scope ? `AND p.department_id IN (${scope.map(() => "?").join(",")})` : "";
  return all<QueueRow>(
    `SELECT c.id course_id, r.semester_id, c.code, c.title, d.name department,
       (SELECT st.display_name FROM allocations a JOIN staff st ON st.id=a.staff_id WHERE a.course_id=c.id AND a.semester_id=r.semester_id LIMIT 1) lecturer, COUNT(*) n
     FROM results x JOIN registrations r ON r.id=x.registration_id JOIN courses c ON c.id=r.course_id
     JOIN programmes p ON p.id=c.programme_id JOIN departments d ON d.id=p.department_id
     WHERE x.status=? ${filter} GROUP BY c.id, r.semester_id, c.code, c.title, d.name ORDER BY d.name, c.code`, status, ...(scope ?? []));
}

export async function decideCourse(actor: Actor, courseId: number, semesterId: number, action: "approve" | "return" | "publish"): Promise<Result<number>> {
  const course = await one<{ department_id: number; code: string }>("SELECT p.department_id, c.code FROM courses c JOIN programmes p ON p.id=c.programme_id WHERE c.id=?", courseId);
  if (!course) return { ok: false, error: "Course not found." };
  const now = Date.now();
  let changes = 0;
  if (action === "approve" || action === "return") {
    if (!can(actor, "results:approve") || !(await approvableDepartments(actor)).includes(course.department_id)) return { ok: false, error: "This course is outside your department." };
    const to = action === "approve" ? "HOD_APPROVED" : "DRAFT";
    changes = (await run(`UPDATE results SET status=?, approved_by=?, updated_at=? WHERE status='SUBMITTED' AND registration_id IN
      (SELECT id FROM registrations WHERE course_id=? AND semester_id=?)`, to, actor.userId, now, courseId, semesterId)).changes;
    await audit(actor.userId, `results.${action}`, "course", courseId, `${changes} rows`);
  } else {
    if (!can(actor, "results:publish")) return { ok: false, error: "Only the examinations office or registrar can publish results." };
    const affected = await all<{ user_id: number }>(`SELECT s.user_id FROM results x JOIN registrations r ON r.id=x.registration_id JOIN students s ON s.id=r.student_id
      WHERE x.status='HOD_APPROVED' AND r.course_id=? AND r.semester_id=?`, courseId, semesterId);
    changes = (await run(`UPDATE results SET status='PUBLISHED', published_by=?, published_at=?, updated_at=? WHERE status='HOD_APPROVED' AND registration_id IN
      (SELECT id FROM registrations WHERE course_id=? AND semester_id=?)`, actor.userId, now, now, courseId, semesterId)).changes;
    for (const a of affected) await notify(a.user_id, "result", "New result published", `Your ${course.code} result is now available.`, "/portal/student/results");
    await audit(actor.userId, "results.publish", "course", courseId, `${changes} rows`);
  }
  return changes ? { ok: true, value: changes } : { ok: false, error: "Nothing to update. It may have already been handled." };
}

export interface StudentResultRow { code: string; title: string; units: number; ca: number; exam: number; total: number; grade: string; points: number; semester_id: number; label: string }

/** Only PUBLISHED results of the given student. Callers pass the student id from the session, never from user input. */
export async function studentResults(studentId: number) {
  const rows = await all<StudentResultRow>(
    `SELECT c.code,c.title,c.units,x.ca,x.exam,x.total,x.grade,x.points,r.semester_id,
       a.label || ' · ' || CASE s.number WHEN 1 THEN 'First' ELSE 'Second' END || ' semester' AS label
     FROM results x JOIN registrations r ON r.id=x.registration_id JOIN courses c ON c.id=r.course_id
     JOIN semesters s ON s.id=r.semester_id JOIN academic_sessions a ON a.id=s.session_id
     WHERE r.student_id=? AND x.status='PUBLISHED' ORDER BY a.label, s.number, c.code`, studentId);
  const groups = new Map<number, { label: string; rows: StudentResultRow[] }>();
  for (const r of rows) {
    if (!groups.has(r.semester_id)) groups.set(r.semester_id, { label: r.label, rows: [] });
    groups.get(r.semester_id)!.rows.push(r);
  }
  let running: StudentResultRow[] = [];
  const semesters = [...groups.values()].map((g) => {
    running = running.concat(g.rows);
    return { label: g.label, rows: g.rows, gpa: gpa(g.rows), cgpa: gpa(running), units: g.rows.reduce((s, r) => s + r.units, 0) };
  });
  return { semesters, cgpa: gpa(rows), totalUnits: rows.reduce((s, r) => s + r.units, 0) };
}

export { currentSemester };
