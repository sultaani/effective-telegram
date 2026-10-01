/**
 * Demo seed. WIPES the database. Everything here is sample content except the college name and the five school names
 * (taken from the official site navigation). Refuses to run in production unless ALLOW_SEED=1.
 * Run with `npm run seed`.
 */
import { closeDb, insert, pool, ready, run, all, one } from "./index";
import { hashPassword } from "../lib/password";
import { gradeFor } from "../lib/grading";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    console.error("Refusing to seed in production. Set ALLOW_SEED=1 only for a fresh demo database.");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  if (!url) { console.error("DATABASE_URL is not set. Put your Neon connection string in the .env file (see .env.example)."); process.exit(1); }
  if (!isLocal && !process.argv.includes("--wipe") && process.env.SEED_CONFIRM !== "wipe") {
    const host = url.replace(/^.*@/, "").replace(/[/?].*$/, "");
    console.error(`This seed ERASES EVERYTHING in the database at ${host}.\nYou do NOT need the seed to get the website content: "npm run migrate" installs it.\nIf this is a disposable demo database or Neon branch and you want the demo students, lecturers and results, run:  npm run seed:demo`);
    process.exit(1);
  }
  await pool().query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await ready();
  const pw = hashPassword(process.env.DEMO_PASSWORD || "Demo@12345");
  const now = Date.now(), day = 86400000;

  // ---- Schools come from the baseline migration; add demo departments to them
  const deptsBySchool: Record<string, string[]> = {
    "arts-and-social-sciences": ["Economics", "Geography", "History", "Political Science", "Social Studies"],
    education: ["Early Childhood Care Education", "Primary Education Studies", "Guidance and Counselling"],
    languages: ["English", "French", "Hausa"],
    "science-education": ["Biology", "Chemistry", "Mathematics", "Physics", "Integrated Science"],
    "vocation-and-technical-education": ["Business Education", "Home Economics", "Computer Science Education"],
  };
  const deptId: Record<string, number> = {};
  for (const [slug, depts] of Object.entries(deptsBySchool)) {
    const school = (await one<{ id: number }>("SELECT id FROM schools WHERE slug=?", slug))!;
    for (const n of depts) deptId[n] = await insert("INSERT INTO departments(school_id,name,slug,verification) VALUES(?,?,?,'SAMPLE')", school.id, n, n.toLowerCase().replace(/[^a-z]+/g, "-"));
  }

  // ---- Sessions and semesters
  const prev = await insert("INSERT INTO academic_sessions(label,is_current) VALUES('2024/2025',0)");
  const cur = await insert("INSERT INTO academic_sessions(label,is_current) VALUES('2025/2026',1)");
  const s1 = await insert("INSERT INTO semesters(session_id,number,is_current) VALUES(?,1,0)", prev);
  const s2 = await insert("INSERT INTO semesters(session_id,number,is_current) VALUES(?,2,0)", prev);
  const s3 = await insert("INSERT INTO semesters(session_id,number,is_current,reg_opens,reg_closes) VALUES(?,1,1,?,?)", cur, now - 20 * day, now + 60 * day);
  await run("INSERT INTO semesters(session_id,number,is_current) VALUES(?,2,0)", cur);

  // ---- Programmes and courses
  const progs: [string, string, string, string][] = [
    ["Biology / Chemistry", "Biology", "NCE", "biology-chemistry"], ["Mathematics / Physics", "Mathematics", "NCE", "mathematics-physics"],
    ["English / History", "English", "NCE", "english-history"], ["Economics / Social Studies", "Economics", "NCE", "economics-social-studies"],
    ["Early Childhood Care Education", "Early Childhood Care Education", "NCE", "early-childhood-care-education"], ["Business Education", "Business Education", "NCE", "business-education"],
    ["Computer Science Education", "Computer Science Education", "NCE", "computer-science-education"], ["Post-Degree Diploma in Education", "Guidance and Counselling", "PDE", "post-degree-diploma-education"],
  ];
  const progId: Record<string, number> = {};
  for (const [title, dept, award, slug] of progs)
    progId[slug] = await insert(`INSERT INTO programmes(department_id,slug,title,award,duration_years,summary,entry_requirements,verification) VALUES(?,?,?,?,?,?,?,'SAMPLE')`,
      deptId[dept], slug, title, award, award === "NCE" ? 3 : 1,
      `${title} prepares graduates to teach at the basic and junior secondary levels, combining subject content with teaching methods and supervised teaching practice.`,
      "Five credit passes including English Language and Mathematics, with the subject requirements for the chosen combination. Confirm the current requirements with the Admissions Office.");
  const gen = (p: string) => [
    ["Foundations of Education", "Use of English I", "Introduction to Teaching Practice", "ICT Skills I", `${p} Methods I`, "Elective: Library Skills", "Educational Psychology", "Use of English II", "Curriculum Studies", "ICT Skills II", `${p} Methods II`, "Elective: Peace Studies"],
    ["Sociology of Education", "Communication Skills", "Classroom Management", "Measurement and Evaluation", `${p} Content I`, "Elective: Entrepreneurship", "Philosophy of Education", "Research Methods", "Instructional Technology", "Guidance and Counselling", `${p} Content II`, "Elective: Environmental Education"],
  ];
  for (const [slug, prefix, subj] of [["biology-chemistry", "BCH", "Biology"], ["mathematics-physics", "MPH", "Mathematics"], ["english-history", "EHS", "English"]] as const)
    for (const [li, lvl] of gen(subj).entries()) for (const [i, t] of lvl.entries()) {
      const sem = i < 6 ? 1 : 2;
      await run("INSERT INTO courses(programme_id,code,title,units,level,semester_no,is_compulsory) VALUES(?,?,?,?,?,?,?)",
        progId[slug], `${prefix} ${li + 1}${sem}${(i % 6) + 1}`, t, i % 6 === 5 ? 2 : 3, (li + 1) * 100, sem, i % 6 < 4 ? 1 : 0);
    }

  // ---- Staff and admin users
  const mk = async (name: string, email: string, roles: string[]) => {
    const id = await insert("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)", email, name, pw, now);
    for (const r of roles) await run("INSERT INTO user_roles(user_id,role) VALUES(?,?)", id, r);
    return id;
  };
  const uid: Record<string, number> = {};
  for (const [n, e, r] of [
    ["Demo Registrar", "registrar", "REGISTRAR"], ["Demo Bursary Officer", "bursary", "BURSARY_OFFICER"], ["Demo Examinations Officer", "exams", "EXAM_OFFICER"],
    ["Demo Website Administrator", "webadmin", "WEBSITE_ADMIN"], ["Demo Content Editor", "editor", "CONTENT_EDITOR"], ["Demo ICT Administrator", "ict", "ICT_ADMIN"], ["Demo Super Administrator", "super", "SUPER_ADMIN"],
  ] as const) uid[e] = await mk(n, `${e}@demo.kcoe.test`, [r]);
  const staffUser = async (name: string, email: string, roles: string[], dept: string, position: string, pub = 0) => {
    const id = await mk(name, email, roles);
    return { uid: id, sid: await insert("INSERT INTO staff(user_id,department_id,display_name,position,is_public,bio) VALUES(?,?,?,?,?,'')", id, deptId[dept], name, position, pub) };
  };
  const lect = await staffUser("Demo Lecturer (Biology)", "lecturer@demo.kcoe.test", ["LECTURER"], "Biology", "Lecturer", 1);
  const lect2 = await staffUser("Demo Lecturer (Chemistry)", "lecturer2@demo.kcoe.test", ["LECTURER"], "Chemistry", "Lecturer", 1);
  const hod = await staffUser("Demo Head of Department (Biology)", "hod@demo.kcoe.test", ["HOD", "LECTURER"], "Biology", "Head of Department", 1);
  await staffUser("Demo Dean (Science Education)", "dean@demo.kcoe.test", ["DEAN"], "Mathematics", "Dean, School of Science Education", 1);

  // ---- Students
  const names = ["Amina Yusuf", "Ojonugwa Ibrahim", "Blessing Attah", "Ene Salihu", "Musa Abdullahi", "Grace Omale", "Peter Ochala", "Fatima Aliyu", "Joy Edeh", "Sunday Ameh", "Halima Idris", "David Ugbede"];
  const students: { id: number; level: number }[] = [];
  for (const [i, n] of names.entries()) {
    const level = i < 6 ? 100 : 200;
    const u = await mk(n, i === 0 ? "student@demo.kcoe.test" : `student${i + 1}@demo.kcoe.test`, ["STUDENT"]);
    const st = await insert("INSERT INTO students(user_id,matric_no,programme_id,entry_session_id,level) VALUES(?,?,?,?,?)", u, `KSCOE/DEMO/${String(i + 1).padStart(4, "0")}`, progId["biology-chemistry"], level === 100 ? cur : prev, level);
    students.push({ id: st, level });
  }
  const cl = (level: number, sem: number) => all<{ id: number }>("SELECT id FROM courses WHERE programme_id=? AND level=? AND semester_no=? ORDER BY code", progId["biology-chemistry"], level, sem);
  const l100s1 = await cl(100, 1), l200s1 = await cl(200, 1), l100s2 = await cl(100, 2);
  const alloc = (staff: number, courses: { id: number }[], sem: number) => Promise.all(courses.map((c) => run("INSERT INTO allocations(staff_id,course_id,semester_id) VALUES(?,?,?)", staff, c.id, sem)));
  await alloc(lect.sid, [l100s1[0], l100s1[1], l100s1[4]], s3); await alloc(lect2.sid, [l100s1[2], l100s1[3]], s3); await alloc(hod.sid, [l200s1[0], l200s1[4]], s3);
  await alloc(lect.sid, [...l100s1, ...l100s2].slice(0, 4), s1);

  // History: level-200 students completed level 100 last session with published results
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (const st of students.filter((s) => s.level === 200)) for (const [sem, list] of [[s1, l100s1], [s2, l100s2]] as const) for (const c of list) {
    const reg = await insert("INSERT INTO registrations(student_id,course_id,semester_id,level_at_registration,status,submitted_at) VALUES(?,?,?,100,'APPROVED',?)", st.id, c.id, sem, now - 300 * day);
    const ca = Math.round(14 + rnd() * 14), ex = Math.round(28 + rnd() * 38), t = ca + ex, g = gradeFor(t);
    await run("INSERT INTO results(registration_id,ca,exam,total,grade,points,status,entered_by,published_by,updated_at,published_at) VALUES(?,?,?,?,?,?,'PUBLISHED',?,?,?,?)", reg, ca, ex, t, g.grade, g.points, lect.uid, uid.exams, now - 280 * day, now - 280 * day);
  }
  for (const [i, st] of students.entries()) {
    if (st.level === 100 && i === 5) continue;
    const status = st.level === 100 && i === 4 ? "SUBMITTED" : "APPROVED";
    for (const c of st.level === 100 ? l100s1 : l200s1)
      await run("INSERT INTO registrations(student_id,course_id,semester_id,level_at_registration,status,submitted_at) VALUES(?,?,?,?,?,?)", st.id, c.id, s3, st.level, status, now - 5 * day);
  }
  {
    const regs = await all<{ id: number }>("SELECT id FROM registrations WHERE course_id=? AND semester_id=? AND status='APPROVED' ORDER BY id", l100s1[0].id, s3);
    for (const [i, r] of regs.entries()) { const ca = 20 + i, ex = 40 + i * 3, t = ca + ex, g = gradeFor(t);
      await run("INSERT INTO results(registration_id,ca,exam,total,grade,points,status,entered_by,updated_at) VALUES(?,?,?,?,?,?,'SUBMITTED',?,?)", r.id, ca, ex, t, g.grade, g.points, lect.uid, now - day); }
  }

  // ---- Timetable, fees
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  for (const [i, c] of [...l100s1, ...l200s1].entries()) {
    await run("INSERT INTO timetable(course_id,semester_id,kind,day,start_time,end_time,venue) VALUES(?,?,'CLASS',?,?,?,?)", c.id, s3, days[i % 5], i % 2 ? "10:00" : "08:00", i % 2 ? "12:00" : "10:00", `Lecture Hall ${1 + (i % 3)}`);
    await run("INSERT INTO timetable(course_id,semester_id,kind,exam_date,start_time,end_time,venue) VALUES(?,?,'EXAM',?,?,?,?)", c.id, s3, `2026-12-${String(7 + (i % 8)).padStart(2, "0")}`, "09:00", "11:00", "Examination Hall");
  }
  for (const [i, st] of students.entries()) {
    const inv = await insert("INSERT INTO invoices(student_id,semester_id,description,amount_kobo,due_date,created_at) VALUES(?,?,?,?,?,?)", st.id, s3, "Tuition and levies", 4500000, "2026-12-31", now - 10 * day);
    if (i % 3 === 0) await run("INSERT INTO payments(invoice_id,reference,amount_kobo,status,method,gateway_ref,paid_at,created_at) VALUES(?,?,?,'SUCCESSFUL','card',?,?,?)", inv, `KCOE-DEMO${String(i).padStart(4, "0")}`, 4500000, `GW-DEMO-${i}`, now - 8 * day, now - 8 * day);
  }

  // Website content (pages, news, events, testimonials) is installed by the baseline migration.
  // The seed only adds two items that demonstrate the CMS workflow and staff-only announcements.
  for (const [type, slug, title, summary, body, status, audience] of [
    ["news", "draft-hostel-allocation", "Draft: new hostel allocation process", "Draft awaiting review.", "Draft content for the CMS workflow.", "REVIEW", "public"],
    ["announcement", "staff-result-meetings", "Staff: departmental result meetings", "Heads of department will review submitted results.", "Staff-only announcement.", "PUBLISHED", "staff"],
  ] as const)
    await run(`INSERT INTO content_items(type,slug,title,summary,body,status,verification,audience,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,'SAMPLE',?,?,?,?)`,
      type, slug, title, summary, body, status, audience, now, now, status === "PUBLISHED" ? now : null);

  await run("INSERT INTO audit_log(actor_id,action,entity,detail,created_at) VALUES(NULL,'seed','system','Demo data created',?)", now);
  console.log("Seeded demo data. Demo accounts (password from DEMO_PASSWORD, default Demo@12345): student@, lecturer@, hod@, dean@, registrar@, bursary@, exams@, webadmin@, editor@, ict@, super@demo.kcoe.test");
  await closeDb();
}
main().catch((e) => { console.error(e); process.exit(1); });
