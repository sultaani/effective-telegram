/**
 * Demo seed. WIPES the database. Everything here is sample content except the college name and the five school names
 * (taken from the official site navigation). Refuses to run in production unless ALLOW_SEED=1.
 * Run with `npm run seed`.
 */
import { closeDb, insert, pool, ready, run, all, one } from "./index";
import { hashPassword } from "../lib/password";
import { gradeFor } from "../lib/grading";
import { PHOTO } from "../lib/images";

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    console.error("Refusing to seed in production. Set ALLOW_SEED=1 only for a fresh demo database.");
    process.exit(1);
  }
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
  if (!isLocal && process.env.SEED_CONFIRM !== "wipe") {
    console.error("This seed ERASES the whole database. To run it against a non-local database (for example a disposable Neon branch), set SEED_CONFIRM=wipe.");
    process.exit(1);
  }
  await pool().query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await ready();
  const pw = hashPassword(process.env.DEMO_PASSWORD || "Demo@12345");
  const now = Date.now(), day = 86400000;

  // ---- Schools (official names) and demo departments
  const schools: Record<string, { name: string; summary: string; depts: string[] }> = {
    "arts-and-social-sciences": { name: "School of Arts and Social Sciences", summary: "Arts, humanities and social science subjects for prospective teachers.", depts: ["Economics", "Geography", "History", "Political Science", "Social Studies"] },
    education: { name: "School of Education", summary: "Professional education, early childhood care and guidance and counselling.", depts: ["Early Childhood Care Education", "Primary Education Studies", "Guidance and Counselling"] },
    languages: { name: "School of Languages", summary: "English, French and Nigerian languages for teacher training.", depts: ["English", "French", "Hausa"] },
    "science-education": { name: "School of Science Education", summary: "Sciences and mathematics for teacher training.", depts: ["Biology", "Chemistry", "Mathematics", "Physics", "Integrated Science"] },
    "vocation-and-technical-education": { name: "School of Vocation and Technical Education", summary: "Vocational, technical and skills-based teacher training.", depts: ["Business Education", "Home Economics", "Computer Science Education"] },
  };
  const deptId: Record<string, number> = {};
  for (const [slug, s] of Object.entries(schools)) {
    const sid = await insert("INSERT INTO schools(slug,name,summary,verification) VALUES(?,?,?,'VERIFIED')", slug, s.name, s.summary);
    for (const n of s.depts) deptId[n] = await insert("INSERT INTO departments(school_id,name,slug,verification) VALUES(?,?,?,'SAMPLE')", sid, n, n.toLowerCase().replace(/[^a-z]+/g, "-"));
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

  // ---- CMS content
  const by = uid.webadmin;
  const content = async (type: string, slug: string, title: string, summary: string, body: string, o: { image?: string; status?: string; date?: string; loc?: string; audience?: string; ago?: number; verification?: string } = {}) => {
    const t = now - (o.ago ?? 0) * day;
    await run(`INSERT INTO content_items(type,slug,title,summary,body,status,verification,audience,event_date,event_location,image_url,created_by,updated_by,created_at,updated_at,published_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, type, slug, title, summary, body, o.status ?? "PUBLISHED", o.verification ?? "SAMPLE", o.audience ?? "public", o.date ?? null, o.loc ?? null, o.image ?? null, by, by, t, t, (o.status === "DRAFT" || o.status === "REVIEW") ? null : t);
  };
  const page = (slug: string, title: string, summary: string, body: string, image?: string) => content("page", slug, title, summary, body, { image });

  await page("about", "About the college", "Kogi State College of Education, Ankpa is a public teacher-training institution in Kogi State, Nigeria.",
    "## Who we are\n\nKogi State College of Education, Ankpa is a public higher institution owned by the Kogi State Government. It trains teachers for the basic and junior secondary levels and awards the Nigeria Certificate in Education (NCE).\n\n## Five schools\n\nThe college is organised into five schools: Arts and Social Sciences, Education, Languages, Science Education, and Vocation and Technical Education. Each school groups related departments and programmes.\n\n## Where to go next\n\n- [Vision and mission](/vision-and-mission)\n- [History and traditions](/history-and-traditions)\n- [Programmes](/programmes)\n- [How to apply](/how-to-apply)", PHOTO.campusAerial);
  await page("provost-welcome", "The Provost's welcome", "Welcome to Kogi State College of Education, Ankpa. We prepare teachers who are grounded in their subjects, skilled in the classroom and committed to their communities.",
    "## A welcome to new and returning students\n\nWelcome to Kogi State College of Education, Ankpa. We prepare teachers who are grounded in their subjects, skilled in the classroom and committed to their communities.\n\nOur schools, lecturers and staff are here to support you from admission to graduation. Use the student portal to register your courses, follow your results and settle your fees, and use the support pages whenever you need help.\n\nI invite you to explore the college, to take full advantage of what it offers, and to join us in building strong classrooms for Kogi State and Nigeria.\n\n**The Provost**", PHOTO.graduate);
  await page("vision-and-mission", "Vision and mission", "What the college is working towards.", "## Vision\n\nTo be a leading centre for teacher education in Nigeria, producing teachers who raise standards in every classroom they enter.\n\n## Mission\n\nTo train competent, disciplined and innovative teachers through quality instruction, supervised teaching practice, research and service to the community.\n\n## Core values\n\n- Integrity and discipline\n- Excellence in teaching and learning\n- Respect and service\n- Innovation and lifelong learning");
  await page("history-and-traditions", "Our history and traditions", "How the college grew in Ankpa.", "## A teacher-training college in Ankpa\n\nKogi State College of Education is a public higher teachers-training institution situated in Ankpa, a major town in the east of Kogi State. Following the creation of Kogi State, the institution became Kogi State College of Education, Ankpa.\n\nOver the years the college has expanded its schools and programmes and introduced a degree programme unit alongside its NCE programmes.", PHOTO.walkway);
  await page("governing-council", "Governing Council", "The body that oversees the policies of the college.", "The Governing Council provides oversight and policy direction for the college on behalf of the Kogi State Government. Council membership and terms of reference are published here by the Registry.");
  await page("our-location", "Our location", "Where to find the college.", "## Ankpa, Kogi State\n\nThe college is in Ankpa, a major town in the east of Kogi State, Nigeria. Prospective students and visitors can reach the Registry and the Admissions Office during normal working hours.\n\n## Getting here\n\nAnkpa is served by road from Anyigba, Idah, Dekina and other towns in Kogi East.", PHOTO.hill);
  await page("ankpa-at-a-glance", "Ankpa at a glance", "About the town that hosts the college.", "Ankpa is a major town in the east of Kogi State. It is a local government headquarters and a commercial and farming centre for the surrounding communities.");
  await page("academic-calendar", "Academic calendar", "Key dates for the session.", "## Sessions and semesters\n\nThe academic year is made up of two semesters. Registration windows, lectures, examinations and breaks are published by the Registry at the start of each session. Sign in to the student portal to see the current semester and your own timetable.");
  await page("library", "College library", "Books, journals and study space.", "The college library supports teaching, learning and research with print and electronic resources and quiet study space. Opening hours are extended during examinations.", PHOTO.library);
  await page("admissions", "Admissions", "How to apply to Kogi State College of Education, Ankpa.", "## How to apply\n\n- Choose a programme and check its entry requirements.\n- Watch this website for the admission notice.\n- Complete the online application and upload the documents requested.\n- Follow the admission list and screening instructions.\n\n## Entry requirements\n\nCandidates need the required O-level credits for their chosen combination, normally including English Language and Mathematics. See each [programme page](/programmes) for details.\n\n## Need help?\n\nContact the Admissions Office through the [contact page](/contact) or read the [frequently asked questions](/faq).", PHOTO.classroom);
  await page("how-to-apply", "How to apply", "Step by step from choosing a programme to admission.", "## Before you apply\n\nRead the entry requirements for your programme and prepare your credentials.\n\n## Applying\n\n1. Choose your programme.\n2. Complete the application form when the admission notice is published.\n3. Upload the documents requested.\n4. Attend screening if you are invited.\n\n## After admission\n\nAccept your offer, pay your fees through the portal, then register your courses.");
  await page("nce-programmes", "NCE programmes", "The Nigeria Certificate in Education.", "The NCE is the college's core programme, preparing teachers for basic and junior secondary schools. Browse the [full programme list](/programmes) to see subject combinations, entry requirements and course lists.", PHOTO.pupils);
  await page("degree-programme", "Degree programme", "Degree studies for teachers.", "The college runs a degree programme unit. Degree courses, partner arrangements and entry requirements are published here by the unit.");
  await page("pde-programme", "Post-Degree Diploma", "Professional teaching qualification for graduates.", "The Post-Degree Diploma in Education is for graduates who wish to qualify as teachers. See the [programme page](/programmes/post-degree-diploma-education) for details.");
  await page("student-affairs", "Student Affairs", "Support for student life and welfare.", "Student Affairs supports orientation, welfare, clubs and societies, and student discipline. Contact the office through the [contact page](/contact).");
  await page("health-services", "Health services", "Care for students and staff.", "The college health service provides first-line care for students and staff. Report emergencies to the security post or the health centre.");
  await page("sports", "Sports and recreation", "Keeping active on campus.", "Sports and recreation activities are coordinated through Student Affairs. Announcements about competitions and trials appear in [news](/news) and [events](/events).");
  await page("research-and-publications", "Research and publications", "Scholarship at the college.", "Lecturers and students carry out research in education, the sciences, the arts and vocational studies. Publications and conference outputs are listed here as they are approved.");
  await page("centres-and-units", "Centres and units", "Specialised units of the college.", "The college hosts units that support teaching and research, including the ICT Directorate and the Degree Programme Unit.");
  await page("teaching-practice", "Teaching practice", "Supervised classroom experience.", "Teaching practice places students in schools under supervision so they can apply what they learn. Postings are announced through the student portal.", PHOTO.teacher);
  await page("facilities", "Facilities", "Lecture halls, library and ICT.", "Campus facilities include lecture halls, laboratories, the library and ICT resources for students and staff.", PHOTO.brick);
  await page("tetfund-high-impact", "TETFund high impact intervention", "Special intervention projects.", "Information on projects supported through the Tertiary Education Trust Fund (TETFund) special interventions is published here by the TETFund desk.");
  await page("tetfund-institution-based-research", "TETFund institution-based research", "Annual research intervention.", "Guidelines, calls and outputs for institution-based research supported by TETFund are published here.");
  await page("tetfund-infrastructure", "TETFund physical infrastructure and programme upgrade", "Annual infrastructure intervention.", "Projects supported by TETFund for physical infrastructure and programme upgrades are listed here.");
  await page("bursary", "Bursary", "Fees, payments and receipts.", "The Bursary manages fees, payments and receipts. Students can pay through the student portal and download receipts instantly.");
  await page("registry", "Registry", "Academic records and administration.", "The Registry keeps student records, coordinates admissions and examinations, and supports the Governing Council and Senate.");
  await page("ict-directorate", "ICT Directorate", "Support for online systems.", "The ICT Directorate runs the college website, the student and staff portals and campus networks. For portal help, sign in and open Support.");
  await page("works-and-maintenance", "Works and maintenance", "Keeping the campus in good order.", "Works and Maintenance looks after buildings, water, power and grounds.");
  await page("security", "Security", "Safety on campus.", "The security unit protects people and property on campus. Report incidents immediately to the nearest security post.");
  await page("servicom", "Servicom", "Service charter and feedback.", "Servicom helps the college keep its service promises. Send compliments, complaints and suggestions through the [contact page](/contact).");
  await page("contact", "Contact us", "How to reach the college.", "## Address\n\nKogi State College of Education, Ankpa, Ankpa, Kogi State, Nigeria.\n\n## Email\n\ninfo@kscoeankpa.edu.ng\n\n## Offices\n\nRegistry, Admissions, Bursary and ICT are open on working days. For portal problems, sign in and use Support.");
  await page("accessibility", "Accessibility", "Our commitment to an accessible website.", "We aim to make this website usable by everyone. If you have trouble using any page, tell us through the [contact page](/contact).");
  await page("terms", "Terms and conditions", "Terms of use for this website.", "By using this website you agree to use it lawfully and not to attempt to gain unauthorised access to portal accounts or data.");
  await page("privacy", "Privacy", "How we handle personal information.", "The college collects only the information needed to admit, teach and support students. Portal data is protected by access controls and is not sold or shared for marketing.");

  const faqs: [string, string][] = [
    ["How do I find my matriculation number?", "Your matriculation number is on your admission letter and on your portal profile after your first sign-in."],
    ["How do I register my courses?", "Sign in to the student portal, open Course registration, choose your electives and submit. The Registrar's office approves your registration."],
    ["What if my payment shows as pending?", "Payments are confirmed by the payment provider, which can take a few minutes. If it stays pending, open Support and share your reference."],
    ["Who do I contact about my results?", "Contact your Head of Department first. Results appear in the portal only after the Examinations Office publishes them."],
  ];
  for (const [i, [q, a]] of faqs.entries()) await content("faq", `faq-${i + 1}`, q, a, a);

  await content("news", "admission-applications-open", "2025/2026 admission applications open", "Applications for NCE programmes are now open. Read the entry requirements and apply.", "Applications for NCE programmes are open.\n\n## What to do\n\n- Read the entry requirements for your programme.\n- Prepare your documents.\n- Apply before the closing date shown in the admission notice.", { image: PHOTO.classroom, ago: 2 });
  await content("news", "orientation-week-for-new-students", "Orientation week for new students", "New students are welcomed with a week of talks, tours and registration help.", "Orientation week introduces new students to the college, the schools, the library and the student portal.", { image: PHOTO.benchLaptops, ago: 6 });
  await content("news", "library-hours-during-examinations", "Extended library hours during examinations", "The library opens longer during examination weeks.", "The library will open for longer hours during examinations so students have more time to study.", { image: PHOTO.library, ago: 12 });
  await content("news", "teaching-practice-postings-released", "Teaching practice postings released", "Students on teaching practice can now check their postings in the portal.", "Postings for teaching practice have been released. Sign in to the student portal to see your school and supervisor.", { image: PHOTO.teacher, ago: 20 });
  await content("news", "draft-hostel-allocation", "Draft: new hostel allocation process", "Draft awaiting review.", "Draft content for the CMS workflow.", { status: "REVIEW" });
  await content("announcement", "course-registration-closes-soon", "Course registration closes soon", "Register your courses in the student portal before the deadline.", "Sign in to the student portal and complete course registration before it closes.", { ago: 1 });
  await content("announcement", "fee-payment-reminder", "Fee payment reminder", "Pay outstanding fees in the portal to receive your receipt instantly.", "Payments are confirmed automatically. Keep your receipt.", { ago: 3 });
  await content("announcement", "staff-result-meetings", "Staff: departmental result meetings", "Heads of department will review submitted results.", "Staff-only announcement.", { audience: "staff", ago: 2 });
  const inDays = (n: number) => new Date(now + n * day).toISOString().slice(0, 10);
  await content("event", "matriculation-ceremony", "Matriculation ceremony", "Ceremony for newly admitted students.", "Matriculation ceremony.", { date: inDays(14), loc: "Main Auditorium" });
  await content("event", "prospective-students-open-day", "Prospective students open day", "Meet departments and ask questions.", "Open day.", { date: inDays(30), loc: "Campus" });
  await content("event", "convocation-lecture", "Convocation lecture", "Annual public lecture.", "Convocation lecture.", { date: inDays(60), loc: "Main Auditorium" });
  await content("download", "academic-calendar-download", "Academic calendar", "Upload the official calendar in the CMS.", "No file has been uploaded to this entry yet.");
  await content("testimonial", "student-amina", "Amina Y.", "The lecturers make time for you, and teaching practice gave me the confidence to stand in front of a class.", "NCE Biology / Chemistry", { image: PHOTO.portraitWoman });
  await content("testimonial", "student-musa", "Musa A.", "Registering my courses and paying my fees online saved me many trips to the office.", "NCE Mathematics / Physics", { image: PHOTO.portraitMan });
  await content("testimonial", "student-blessing", "Blessing A.", "The library and the study groups helped me keep up, and I found friends for life.", "NCE English / History", { image: PHOTO.laptopMan });

  await run("INSERT INTO audit_log(actor_id,action,entity,detail,created_at) VALUES(NULL,'seed','system','Demo data created',?)", now);
  console.log("Seeded demo data. Demo accounts (password from DEMO_PASSWORD, default Demo@12345): student@, lecturer@, hod@, dean@, registrar@, bursary@, exams@, webadmin@, editor@, ict@, super@demo.kcoe.test");
  await closeDb();
}
main().catch((e) => { console.error(e); process.exit(1); });
