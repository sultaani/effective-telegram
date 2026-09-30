import { all, one, run, tx } from "../db";
import { audit } from "../lib/audit";
import { notify } from "../lib/notify";
import { currentSemester, registrationOpen } from "./academics";
import type { Result } from "./cms";

/** Unit limits per semester. ASSUMPTION: confirm with the college and move to settings. */
export const MIN_UNITS = 15;
export const MAX_UNITS = 24;

export interface CourseOption { id: number; code: string; title: string; units: number; is_compulsory: number; selected: number }

export async function registrationView(studentId: number) {
  const sem = await currentSemester();
  const st = await one<{ programme_id: number; level: number }>("SELECT programme_id, level FROM students WHERE id=?", studentId);
  if (!sem || !st) return null;
  const courses = await all<CourseOption>(
    `SELECT c.id,c.code,c.title,c.units,c.is_compulsory,
       (EXISTS(SELECT 1 FROM registrations r WHERE r.student_id=? AND r.course_id=c.id AND r.semester_id=?))::int AS selected
     FROM courses c WHERE c.programme_id=? AND c.level=? AND c.semester_no=? ORDER BY c.is_compulsory DESC, c.code`,
    studentId, sem.id, st.programme_id, st.level, sem.number);
  const status = (await one<{ status: string }>("SELECT status FROM registrations WHERE student_id=? AND semester_id=? LIMIT 1", studentId, sem.id))?.status ?? "NOT_STARTED";
  return { semester: sem, level: st.level, courses, status, open: registrationOpen(sem), min: MIN_UNITS, max: MAX_UNITS };
}

/** Only the student's own registration can be changed, and only while it is a draft or was rejected. */
export async function saveRegistration(studentId: number, userId: number, courseIds: number[], submit: boolean): Promise<Result> {
  const v = await registrationView(studentId);
  if (!v) return { ok: false, error: "No active semester is configured." };
  if (!v.open) return { ok: false, error: "Course registration is closed for this semester." };
  if (v.status === "SUBMITTED" || v.status === "APPROVED") return { ok: false, error: "Your registration is already submitted and can no longer be changed." };
  const valid = new Map(v.courses.map((c) => [c.id, c]));
  const chosen = [...new Set(courseIds)];
  if (chosen.some((id) => !valid.has(id))) return { ok: false, error: "One of the selected courses is not available for your programme and level." };
  const missing = v.courses.filter((c) => c.is_compulsory && !chosen.includes(c.id));
  if (missing.length) return { ok: false, error: `Compulsory courses missing: ${missing.map((m) => m.code).join(", ")}.` };
  const units = chosen.reduce((s, id) => s + valid.get(id)!.units, 0);
  if (submit && (units < MIN_UNITS || units > MAX_UNITS)) return { ok: false, error: `Register between ${MIN_UNITS} and ${MAX_UNITS} units. You selected ${units}.` };
  const st = (await one<{ level: number }>("SELECT level FROM students WHERE id=?", studentId))!;
  await tx(async () => {
    await run("DELETE FROM registrations WHERE student_id=? AND semester_id=?", studentId, v.semester.id);
    for (const id of chosen)
      await run("INSERT INTO registrations(student_id,course_id,semester_id,level_at_registration,status,submitted_at) VALUES(?,?,?,?,?,?)",
        studentId, id, v.semester.id, st.level, submit ? "SUBMITTED" : "DRAFT", submit ? Date.now() : null);
  });
  await audit(userId, submit ? "registration.submit" : "registration.save", "student", studentId, `${chosen.length} courses`);
  return { ok: true, value: undefined };
}

export async function pendingRegistrations() {
  const sem = await currentSemester();
  if (!sem) return [];
  return all<{ student_id: number; name: string; matric_no: string; programme: string; level: number; courses: number; units: number }>(
    `SELECT s.id student_id, u.name, s.matric_no, p.title programme, s.level, COUNT(*) courses, SUM(c.units) units
     FROM registrations r JOIN students s ON s.id=r.student_id JOIN users u ON u.id=s.user_id JOIN programmes p ON p.id=s.programme_id
     JOIN courses c ON c.id=r.course_id WHERE r.semester_id=? AND r.status='SUBMITTED' GROUP BY s.id, u.name, p.title ORDER BY u.name`, sem.id);
}

export async function decideRegistration(actorId: number, studentId: number, approve: boolean): Promise<Result> {
  const sem = await currentSemester();
  if (!sem) return { ok: false, error: "No active semester." };
  const r = await run("UPDATE registrations SET status=? WHERE student_id=? AND semester_id=? AND status='SUBMITTED'", approve ? "APPROVED" : "REJECTED", studentId, sem.id);
  if (!r.changes) return { ok: false, error: "There is no submitted registration to decide on." };
  const u = (await one<{ user_id: number }>("SELECT user_id FROM students WHERE id=?", studentId))!;
  await audit(actorId, approve ? "registration.approve" : "registration.reject", "student", studentId);
  await notify(u.user_id, "registration", approve ? "Course registration approved" : "Course registration returned",
    approve ? `Your registration for ${sem.label} has been approved.` : "Your registration was returned. Review your courses and submit again.", "/portal/student/registration");
  return { ok: true, value: undefined };
}
