/**
 * Demo seed. Everything here is SAMPLE data except the five school names and the college name,
 * which come from the official site navigation. Run with `npm run seed` (wipes and rebuilds the demo DB).
 */
import fs from "node:fs";
import path from "node:path";
import { dataDir, openDb } from "./index";
import { hashPassword } from "../lib/password";
import { gradeFor } from "../lib/grading";

const file = process.env.DATABASE_FILE ?? path.join(dataDir(), "kcoe.db");
for (const f of [file, file + "-wal", file + "-shm"]) if (fs.existsSync(f)) fs.rmSync(f);
const d = openDb(file);
const pw = hashPassword(process.env.DEMO_PASSWORD || "Demo@12345");
const now = Date.now();
const day = 86400000;
const ins = (sql: string, ...p: unknown[]) => Number(d.prepare(sql).run(...p).lastInsertRowid);

// ---- Schools and departments (school names verified from official site; departments are demo)
const schools: Record<string, { name: string; summary: string; depts: string[] }> = {
  "arts-and-social-sciences": { name: "School of Arts and Social Sciences", summary: "Demo summary: programmes in the arts, humanities and social sciences for prospective teachers.", depts: ["Economics", "Geography", "History", "Political Science", "Social Studies"] },
  education: { name: "School of Education", summary: "Demo summary: professional education, early childhood and guidance studies.", depts: ["Early Childhood Care Education", "Primary Education Studies", "Guidance and Counselling"] },
  languages: { name: "School of Languages", summary: "Demo summary: English, French and Nigerian languages for teacher training.", depts: ["English", "French", "Hausa"] },
  "science-education": { name: "School of Science Education", summary: "Demo summary: sciences and mathematics for teacher training.", depts: ["Biology", "Chemistry", "Mathematics", "Physics", "Integrated Science"] },
  "vocation-and-technical-education": { name: "School of Vocation and Technical Education", summary: "Demo summary: vocational, technical and skills-based teacher training.", depts: ["Business Education", "Home Economics", "Computer Science Education"] },
};
const deptId: Record<string, number> = {};
for (const [slug, s] of Object.entries(schools)) {
  const sid = ins("INSERT INTO schools(slug,name,summary,verification) VALUES(?,?,?,?)", slug, s.name, s.summary, "VERIFIED");
  for (const n of s.depts) deptId[n] = ins("INSERT INTO departments(school_id,name,slug,verification) VALUES(?,?,?,'SAMPLE')", sid, n, n.toLowerCase().replace(/[^a-z]+/g, "-"));
}

// ---- Sessions and semesters
const sess = ins("INSERT INTO academic_sessions(label,is_current) VALUES('2024/2025',0)");
const cur = ins("INSERT INTO academic_sessions(label,is_current) VALUES('2025/2026',1)");
const s1 = ins("INSERT INTO semesters(session_id,number,is_current) VALUES(?,1,0)", sess);
const s2 = ins("INSERT INTO semesters(session_id,number,is_current) VALUES(?,2,0)", sess);
const s3 = ins("INSERT INTO semesters(session_id,number,is_current,reg_opens,reg_closes) VALUES(?,1,1,?,?)", cur, now - 20 * day, now + 60 * day);
ins("INSERT INTO semesters(session_id,number,is_current) VALUES(?,2,0)", cur);

// ---- Programmes (demo subject combinations) and courses
const progs: [string, string, string, string][] = [
  ["Biology / Chemistry", "Biology", "NCE", "biology-chemistry"],
  ["Mathematics / Physics", "Mathematics", "NCE", "mathematics-physics"],
  ["English / History", "English", "NCE", "english-history"],
  ["Economics / Social Studies", "Economics", "NCE", "economics-social-studies"],
  ["Early Childhood Care Education", "Early Childhood Care Education", "NCE", "early-childhood-care-education"],
  ["Business Education", "Business Education", "NCE", "business-education"],
  ["Computer Science Education", "Computer Science Education", "NCE", "computer-science-education"],
  ["Post-Degree Diploma in Education", "Guidance and Counselling", "PDE", "post-degree-diploma-education"],
];
const progId: Record<string, number> = {};
for (const [title, dept, award, slug] of progs)
  progId[slug] = ins(`INSERT INTO programmes(department_id,slug,title,award,duration_years,summary,entry_requirements,verification) VALUES(?,?,?,?,?,?,?,'SAMPLE')`,
    deptId[dept], slug, title, award, award === "NCE" ? 3 : 1,
    `Demo programme description for ${title}. Replace with the college's approved programme text.`,
    "Demo entry requirements: five credits including English Language and Mathematics, plus subject requirements. Confirm with the Admissions Office.");

const courseIds: Record<string, number[]> = {};
function courses(slug: string, prefix: string, titles: string[][]) {
  courseIds[slug] = [];
  // titles[level-1] = 12 titles: 6 per semester
  titles.forEach((lvl, li) => lvl.forEach((t, i) => {
    const sem = i < 6 ? 1 : 2;
    const units = i % 6 === 0 ? 3 : i % 6 === 5 ? 2 : 3;
    courseIds[slug].push(ins("INSERT INTO courses(programme_id,code,title,units,level,semester_no,is_compulsory) VALUES(?,?,?,?,?,?,?)",
      progId[slug], `${prefix} ${(li + 1)}${sem}${(i % 6) + 1}`, t, units, (li + 1) * 100, sem, i % 6 < 4 ? 1 : 0));
  }));
}
const gen = (p: string) => [
  ["Foundations of Education", "Use of English I", "Introduction to Teaching Practice", "ICT Skills I", `${p} Methods I`, "Elective: Library Skills",
   "Educational Psychology", "Use of English II", "Curriculum Studies", "ICT Skills II", `${p} Methods II`, "Elective: Peace Studies"],
  ["Sociology of Education", "Communication Skills", "Classroom Management", "Measurement and Evaluation", `${p} Content I`, "Elective: Entrepreneurship",
   "Philosophy of Education", "Research Methods", "Instructional Technology", "Guidance and Counselling", `${p} Content II`, "Elective: Environmental Education"],
];
courses("biology-chemistry", "BCH", gen("Biology"));
courses("mathematics-physics", "MPH", gen("Mathematics"));
courses("english-history", "EHS", gen("English"));

// ---- Users
type U = { name: string; email: string; roles: string[] };
const users: U[] = [
  { name: "Demo Registrar", email: "registrar@demo.kcoe.test", roles: ["REGISTRAR"] },
  { name: "Demo Bursary Officer", email: "bursary@demo.kcoe.test", roles: ["BURSARY_OFFICER"] },
  { name: "Demo Examinations Officer", email: "exams@demo.kcoe.test", roles: ["EXAM_OFFICER"] },
  { name: "Demo Website Administrator", email: "webadmin@demo.kcoe.test", roles: ["WEBSITE_ADMIN"] },
  { name: "Demo Content Editor", email: "editor@demo.kcoe.test", roles: ["CONTENT_EDITOR"] },
  { name: "Demo ICT Administrator", email: "ict@demo.kcoe.test", roles: ["ICT_ADMIN"] },
  { name: "Demo Super Administrator", email: "super@demo.kcoe.test", roles: ["SUPER_ADMIN"] },
];
const uid: Record<string, number> = {};
for (const u of users) {
  uid[u.email] = ins("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)", u.email, u.name, pw, now);
  u.roles.forEach((r) => d.prepare("INSERT INTO user_roles VALUES(?,?)").run(uid[u.email], r));
}
function staffUser(name: string, email: string, roles: string[], dept: string, position: string, pub = 0) {
  const id = ins("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)", email, name, pw, now);
  roles.forEach((r) => d.prepare("INSERT INTO user_roles VALUES(?,?)").run(id, r));
  return { uid: id, sid: ins("INSERT INTO staff(user_id,department_id,display_name,position,is_public,bio) VALUES(?,?,?,?,?,?)", id, deptId[dept], name, position, pub, "Demo profile text.") };
}
const lect = staffUser("Demo Lecturer (Biology)", "lecturer@demo.kcoe.test", ["LECTURER"], "Biology", "Lecturer", 1);
const lect2 = staffUser("Demo Lecturer (Chemistry)", "lecturer2@demo.kcoe.test", ["LECTURER"], "Chemistry", "Lecturer", 1);
const hod = staffUser("Demo Head of Department (Biology)", "hod@demo.kcoe.test", ["HOD", "LECTURER"], "Biology", "Head of Department", 1);
staffUser("Demo Dean (Science Education)", "dean@demo.kcoe.test", ["DEAN"], "Mathematics", "Dean, School of Science Education", 1);

// ---- Students (12 across the Biology/Chemistry programme, levels 100 and 200) + a few elsewhere
const names = ["Amina Yusuf", "Ojonugwa Ibrahim", "Blessing Attah", "Ene Salihu", "Musa Abdullahi", "Grace Omale", "Peter Ochala", "Fatima Aliyu", "Joy Edeh", "Sunday Ameh", "Halima Idris", "David Ugbede"];
const students: { id: number; user: number; level: number }[] = [];
names.forEach((n, i) => {
  const level = i < 6 ? 100 : 200;
  const email = i === 0 ? "student@demo.kcoe.test" : `student${i + 1}@demo.kcoe.test`;
  const u = ins("INSERT INTO users(email,name,password_hash,created_at) VALUES(?,?,?,?)", email, n, pw, now);
  d.prepare("INSERT INTO user_roles VALUES(?,?)").run(u, "STUDENT");
  const st = ins("INSERT INTO students(user_id,matric_no,programme_id,entry_session_id,level,phone) VALUES(?,?,?,?,?,?)",
    u, `KSCOE/DEMO/${String(i + 1).padStart(4, "0")}`, progId["biology-chemistry"], level === 100 ? cur : sess, level, null);
  students.push({ id: st, user: u, level });
});

// Allocation for current semester: lecturer teaches first three level-100 sem-1 courses; second lecturer the next; HOD one
const bc = courseIds["biology-chemistry"];
const cl = (level: number, sem: number) => d.prepare("SELECT id FROM courses WHERE programme_id=? AND level=? AND semester_no=? ORDER BY code").all(progId["biology-chemistry"], level, sem) as { id: number }[];
const l100s1 = cl(100, 1), l200s1 = cl(200, 1), l100s2 = cl(100, 2), l200s2 = cl(200, 2);
[l100s1[0], l100s1[1], l100s1[4]].forEach((c) => d.prepare("INSERT INTO allocations(staff_id,course_id,semester_id) VALUES(?,?,?)").run(lect.sid, c.id, s3));
[l100s1[2], l100s1[3]].forEach((c) => d.prepare("INSERT INTO allocations(staff_id,course_id,semester_id) VALUES(?,?,?)").run(lect2.sid, c.id, s3));
[l200s1[0], l200s1[4]].forEach((c) => d.prepare("INSERT INTO allocations(staff_id,course_id,semester_id) VALUES(?,?,?)").run(hod.sid, c.id, s3));
// previous-session allocations so history exists
[...l100s1, ...l100s2].slice(0, 4).forEach((c) => d.prepare("INSERT INTO allocations(staff_id,course_id,semester_id) VALUES(?,?,?)").run(lect.sid, c.id, s1));

// ---- History: level-200 students completed level 100 in 2024/2025 with PUBLISHED results
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (const st of students.filter((s) => s.level === 200)) {
  for (const [sem, list] of [[s1, l100s1], [s2, l100s2]] as const) {
    for (const c of list) {
      const reg = ins("INSERT INTO registrations(student_id,course_id,semester_id,level_at_registration,status,submitted_at) VALUES(?,?,?,100,'APPROVED',?)", st.id, c.id, sem, now - 300 * day);
      const ca = Math.round(14 + rnd() * 14), ex = Math.round(28 + rnd() * 38), t = ca + ex, g = gradeFor(t);
      d.prepare("INSERT INTO results(registration_id,ca,exam,total,grade,points,status,entered_by,published_by,updated_at,published_at) VALUES(?,?,?,?,?,?,'PUBLISHED',?,?,?,?)")
        .run(reg, ca, ex, t, g.grade, g.points, lect.uid, uid["exams@demo.kcoe.test"], now - 280 * day, now - 280 * day);
    }
  }
}
// Current semester: level-100 students 1-4 registered & approved (results pending); 5th submitted; 6th not started; level-200 approved
for (const [i, st] of students.entries()) {
  const list = st.level === 100 ? l100s1 : l200s1;
  if (st.level === 100 && i === 5) continue;
  const status = st.level === 100 && i === 4 ? "SUBMITTED" : "APPROVED";
  for (const c of list) d.prepare("INSERT INTO registrations(student_id,course_id,semester_id,level_at_registration,status,submitted_at) VALUES(?,?,?,?,?,?)").run(st.id, c.id, s3, st.level, status, now - 5 * day);
}
// Some results already flowing so every queue has content: first course scored & submitted to HOD
{
  const c = l100s1[0].id;
  const regs = d.prepare("SELECT r.id FROM registrations r WHERE r.course_id=? AND r.semester_id=? AND r.status='APPROVED'").all(c, s3) as { id: number }[];
  regs.forEach((r, i) => { const ca = 20 + i, ex = 40 + i * 3, t = ca + ex, g = gradeFor(t);
    d.prepare("INSERT INTO results(registration_id,ca,exam,total,grade,points,status,entered_by,updated_at) VALUES(?,?,?,?,?,?,'SUBMITTED',?,?)").run(r.id, ca, ex, t, g.grade, g.points, lect.uid, now - day); });
}

// ---- Timetable
const tt = (course: number, day: string, s: string, e: string, venue: string) => d.prepare("INSERT INTO timetable(course_id,semester_id,kind,day,start_time,end_time,venue) VALUES(?,?,'CLASS',?,?,?,?)").run(course, s3, day, s, e, venue);
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
[...l100s1, ...l200s1].forEach((c, i) => tt(c.id, days[i % 5], i % 2 ? "10:00" : "08:00", i % 2 ? "12:00" : "10:00", `Demo Lecture Hall ${1 + (i % 3)}`));
[...l100s1, ...l200s1].forEach((c, i) => d.prepare("INSERT INTO timetable(course_id,semester_id,kind,exam_date,start_time,end_time,venue) VALUES(?,?,'EXAM',?,?,?,?)")
  .run(c.id, s3, `2026-01-${String(12 + (i % 8)).padStart(2, "0")}`, "09:00", "11:00", "Demo Examination Hall"));

// ---- Fees: tuition invoice for all current students; a few paid
students.forEach((st, i) => {
  const inv = ins("INSERT INTO invoices(student_id,semester_id,description,amount_kobo,due_date,created_at) VALUES(?,?,?,?,?,?)", st.id, s3, "Demo tuition and levies", 4500000, "2026-01-31", now - 10 * day);
  if (i % 3 === 0) d.prepare("INSERT INTO payments(invoice_id,reference,amount_kobo,status,method,gateway_ref,paid_at,created_at) VALUES(?,?,?,'SUCCESSFUL','card',?,?,?)")
    .run(inv, `KCOE-DEMO${String(i).padStart(4, "0")}`, 4500000, `GW-DEMO-${i}`, now - 8 * day, now - 8 * day);
});

// ---- CMS content (all SAMPLE unless noted)
function content(type: string, slug: string, title: string, summary: string, body: string, opts: { verification?: string; status?: string; date?: string; loc?: string; audience?: string; ago?: number } = {}) {
  const t = now - (opts.ago ?? 0) * day;
  d.prepare(`INSERT INTO content_items(type,slug,title,summary,body,status,verification,audience,event_date,event_location,created_by,updated_by,created_at,updated_at,published_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(type, slug, title, summary, body, opts.status ?? "PUBLISHED", opts.verification ?? "SAMPLE", opts.audience ?? "public",
    opts.date ?? null, opts.loc ?? null, uid["webadmin@demo.kcoe.test"], uid["webadmin@demo.kcoe.test"], t, t, opts.status === "DRAFT" || opts.status === "REVIEW" ? null : t);
}
content("page", "about", "About the college", "Kogi State College of Education, Ankpa is a public teacher-training institution in Kogi State, Nigeria.",
  "## Who we are\n\nKogi State College of Education, Ankpa is a public higher institution owned by the Kogi State Government, training teachers for the National Certificate in Education (NCE).\n\n## History\n\nThe college's history section is awaiting confirmation. Demo text: the college was established in 1981 and moved to its permanent site in Ankpa. The Registrar's office should supply the approved history before launch.\n\n## Mission and vision\n\nDemo text pending the college's approved mission and vision statements.",
  { verification: "AWAITING_CONFIRMATION" });
content("page", "admissions", "Admissions", "How to apply to Kogi State College of Education, Ankpa.",
  "## How to apply\n\n- Check the programme you want and its entry requirements.\n- Buy the application form when the admission notice is published.\n- Complete the online application and upload the documents requested.\n- Watch this website and your email for the admission list.\n\n## Entry requirements\n\nDemo text: candidates need the required O-level credits for the programme. See each programme page for details, and confirm with the Admissions Office.\n\n## Fees\n\nFees are set by the college each session. They are not listed here in the demo.");
content("page", "contact", "Contact us", "Where to find the college and how to reach it.",
  "## Address\n\nKogi State College of Education, Ankpa, Ankpa, Kogi State, Nigeria.\n\n## Email\n\ninfo@kscoeankpa.edu.ng (as shown on the current college website)\n\n## Telephone\n\nPending confirmation. The current website shows a number that needs verifying with the college.", { verification: "AWAITING_CONFIRMATION" });
content("page", "ict-directorate", "ICT Directorate", "Support for students and staff using the college's online systems.", "Demo text. For portal help, sign in and open Support, or visit the ICT Directorate during office hours.");
[["How do I find my matriculation number?", "Your matriculation number is on your admission letter and on your portal profile after your first sign-in."],
 ["How do I register my courses?", "Sign in to the student portal, open Course registration, tick your electives, and submit. Your registration is approved by the Registrar's office."],
 ["What if my payment shows as pending?", "Payments are confirmed by the payment provider, which can take a few minutes. If it stays pending, open Support and share your reference."],
 ["Who do I contact about my results?", "Contact your Head of Department first. Results appear in the portal only after they are published by the Examinations Office."]]
  .forEach(([q, a], i) => content("faq", `faq-${i + 1}`, q, a, a));
content("news", "demo-2025-26-admission-open", "Demo notice: 2025/2026 admission applications open", "Applications for NCE programmes are open. This is demo content.", "This is a demo news item showing how notices appear on the site.\n\n## What to do\n\n- Read the entry requirements for your programme.\n- Prepare your documents.\n- Apply before the closing date shown in the admission notice.", { ago: 2 });
content("news", "demo-orientation-week", "Demo: orientation week for new students", "New students are welcome to orientation. This is demo content.", "Demo article about orientation activities for newly admitted students.", { ago: 6 });
content("news", "demo-library-hours", "Demo: extended library hours during examinations", "The library opens longer during examination weeks. This is demo content.", "Demo article. Replace with the library's real announcement.", { ago: 12 });
content("news", "demo-teaching-practice", "Demo: teaching practice posting released", "Students on teaching practice can check their posting. This is demo content.", "Demo article about teaching practice postings.", { ago: 20 });
content("announcement", "demo-registration-deadline", "Course registration closes soon", "Register your courses in the student portal before the deadline.", "Sign in to the student portal and complete course registration before it closes.", { ago: 1 });
content("announcement", "demo-fee-reminder", "Fee payment reminder", "Pay outstanding fees in the portal to receive your receipt instantly.", "Payments are confirmed automatically. Keep your receipt.", { ago: 3 });
content("announcement", "demo-staff-meeting", "Staff: departmental result meetings", "Heads of department will review submitted results.", "Staff-only demo announcement.", { audience: "staff", ago: 2 });
const nextMonth = (n: number) => new Date(now + n * day).toISOString().slice(0, 10);
content("event", "demo-matriculation", "Demo: matriculation ceremony", "Ceremony for newly admitted students.", "Demo event.", { date: nextMonth(14), loc: "Demo Main Auditorium" });
content("event", "demo-open-day", "Demo: prospective students open day", "Meet departments and ask questions.", "Demo event.", { date: nextMonth(30), loc: "Demo Campus" });
content("event", "demo-convocation", "Demo: convocation lecture", "Annual public lecture.", "Demo event.", { date: nextMonth(60), loc: "Demo Main Auditorium" });
content("news", "demo-draft-story", "Draft: new hostel allocation process", "Draft awaiting review.", "Draft content for the CMS workflow demo.", { status: "REVIEW" });
content("download", "demo-academic-calendar", "Academic calendar (demo placeholder)", "Placeholder entry. Upload the real calendar in the CMS.", "No file has been uploaded to this demo entry yet.");

d.prepare("INSERT INTO audit_log(actor_id,action,entity,detail,created_at) VALUES(NULL,'seed','system','Demo data created',?)").run(now);
console.log(`Seeded demo data into ${file}`);
console.log("Demo accounts (password from DEMO_PASSWORD, default Demo@12345): student@, lecturer@, hod@, dean@, registrar@, bursary@, exams@, webadmin@, editor@, ict@, super@demo.kcoe.test");
