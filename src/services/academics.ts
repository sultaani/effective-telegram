import { all, one } from "../db";

export interface Semester { id: number; session_id: number; number: number; is_current: number; reg_opens: number | null; reg_closes: number | null; label: string }

export function currentSemester(): Semester | undefined {
  return one<Semester>(`SELECT s.*, a.label || ' · ' || CASE s.number WHEN 1 THEN 'First' ELSE 'Second' END || ' semester' AS label
    FROM semesters s JOIN academic_sessions a ON a.id=s.session_id WHERE s.is_current=1`);
}
export function allSemesters(): Semester[] {
  return all<Semester>(`SELECT s.*, a.label || ' · ' || CASE s.number WHEN 1 THEN 'First' ELSE 'Second' END || ' semester' AS label
    FROM semesters s JOIN academic_sessions a ON a.id=s.session_id ORDER BY a.label DESC, s.number DESC`);
}
export function registrationOpen(s: Semester, now = Date.now()): boolean {
  return (!s.reg_opens || now >= s.reg_opens) && (!s.reg_closes || now <= s.reg_closes);
}

export const listSchools = () => all<{ id: number; slug: string; name: string; summary: string; verification: string }>("SELECT * FROM schools ORDER BY name");
export const getSchool = (slug: string) => one<{ id: number; slug: string; name: string; summary: string; verification: string }>("SELECT * FROM schools WHERE slug=?", slug);
export const departmentsOf = (schoolId: number) => all<{ id: number; name: string; slug: string }>("SELECT id,name,slug FROM departments WHERE school_id=? ORDER BY name", schoolId);

export interface ProgrammeRow {
  id: number; slug: string; title: string; award: string; duration_years: number; summary: string; entry_requirements: string;
  verification: string; department: string; school: string; school_slug: string; department_id: number; is_active: number;
}
const PROG_SQL = `SELECT p.id,p.slug,p.title,p.award,p.duration_years,p.summary,p.entry_requirements,p.verification,p.is_active,p.department_id,
  d.name AS department, s.name AS school, s.slug AS school_slug
  FROM programmes p JOIN departments d ON d.id=p.department_id JOIN schools s ON s.id=d.school_id`;

export function listProgrammes(opts: { q?: string; school?: string; award?: string; includeInactive?: boolean } = {}): ProgrammeRow[] {
  const where: string[] = []; const p: unknown[] = [];
  if (!opts.includeInactive) where.push("p.is_active=1");
  if (opts.q) { where.push("(p.title LIKE ? ESCAPE '\\' OR d.name LIKE ? ESCAPE '\\')"); const like = `%${opts.q.replace(/[\\%_]/g, "\\$&")}%`; p.push(like, like); }
  if (opts.school) { where.push("s.slug=?"); p.push(opts.school); }
  if (opts.award) { where.push("p.award=?"); p.push(opts.award); }
  return all<ProgrammeRow>(`${PROG_SQL} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY s.name, p.title`, ...p);
}
export const getProgramme = (slug: string) => one<ProgrammeRow>(`${PROG_SQL} WHERE p.slug=? AND p.is_active=1`, slug);
export const getProgrammeById = (id: number) => one<ProgrammeRow>(`${PROG_SQL} WHERE p.id=?`, id);
export const coursesOfProgramme = (programmeId: number) =>
  all<{ id: number; code: string; title: string; units: number; level: number; semester_no: number; is_compulsory: number }>(
    "SELECT * FROM courses WHERE programme_id=? ORDER BY level, semester_no, code", programmeId);

export function publicStaff() {
  return all<{ id: number; display_name: string; position: string; bio: string; department: string | null }>(
    `SELECT st.id, st.display_name, st.position, st.bio, d.name AS department FROM staff st LEFT JOIN departments d ON d.id=st.department_id
     WHERE st.is_public=1 ORDER BY st.display_name`);
}
