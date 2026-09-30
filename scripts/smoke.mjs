// End-to-end smoke test against a running server: node scripts/smoke.mjs [baseUrl]
// Sessions are created directly in the database so every role's pages are exercised without a browser.
import crypto from "node:crypto";
import pg from "pg";

const base = process.argv[2] || "http://localhost:3000";
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const one = async (sql, ...p) => (await db.query(sql, p)).rows[0];
let pass = 0, fail = 0;
const ok = (cond, msg) => { cond ? pass++ : (fail++, console.log("FAIL:", msg)); };

async function cookieFor(email) {
  const u = await one("SELECT id FROM users WHERE lower(email)=lower($1)", email);
  const token = crypto.randomBytes(24).toString("base64url");
  await db.query("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES($1,$2,$3,$4)", [crypto.createHash("sha256").update(token).digest("hex"), u.id, Date.now() + 3600e3, Date.now()]);
  return `kcoe_session=${token}`;
}
const get = async (path, cookie) => {
  const r = await fetch(base + path, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: r.status, loc: r.headers.get("location"), headers: r.headers, text: await r.text() };
};
const E = (n) => `${n}@demo.kcoe.test`;

// --- Public site
for (const p of ["/", "/gallery", "/vision-and-mission", "/governing-council", "/provost-welcome", "/nce-programmes", "/how-to-apply", "/tetfund-high-impact", "/bursary", "/privacy", "/about", "/admissions", "/contact", "/schools", "/schools/science-education", "/programmes", "/programmes/biology-chemistry", "/news", "/news/admission-applications-open", "/events", "/faq", "/downloads", "/about/leadership", "/search?q=biology", "/sitemap.xml", "/robots.txt", "/portal/login"]) {
  const r = await get(p); ok(r.status === 200, `${p} -> ${r.status}`);
}
ok((await get("/nope-not-real")).status === 404, "unknown page is 404");
ok((await get("/news/draft-hostel-allocation")).status === 404, "draft news hidden from public");
const home = await get("/");
ok(home.text.includes("Find the right programme"), "home has programme finder");
ok(home.text.includes("What our students say") && home.text.includes("Latest news") && home.text.includes("Study at KCOE") && home.text.includes("The Provost"), "home has student voices, latest news, study section and provost welcome");
ok((home.text.match(/images\.unsplash\.com/g) || []).length >= 6, "home uses real photographs");
ok(!/awaiting confirmation|demo content|demonstration build/i.test(home.text), "no draft notices on the public home page");
for (const item of ["Governing Council", "Vision and Mission", "Support Services", "TETFund", "Admissions", "Academics"]) ok(home.text.includes(item), `nav contains ${item}`);
for (const pth of ["/about", "/admissions", "/programmes/biology-chemistry", "/news/admission-applications-open"]) ok(!/awaiting confirmation|demo content/i.test((await get(pth)).text), `${pth} has no draft notices`);
ok(home.headers.get("x-frame-options") === "DENY" && home.headers.get("content-security-policy"), "security headers present");
ok(!/x-powered-by/i.test([...home.headers.keys()].join()), "no x-powered-by");
const s = await get("/search?q=" + encodeURIComponent("<script>alert(1)</script>"));
ok(!s.text.includes("<script>alert(1)</script>"), "search reflects input safely");
ok((await get("/programmes?q=%25")).status === 200, "wildcard search safe");
ok(!(await get("/sitemap.xml")).text.includes("draft-hostel-allocation"), "sitemap excludes drafts");

// --- Unauthenticated access
for (const p of ["/portal/student", "/portal/staff", "/portal/admin", "/portal/admin/users", "/portal/student/results"]) {
  const r = await get(p); ok(r.status === 307 && r.loc?.includes("/portal/login"), `${p} redirects to login (${r.status})`);
}
ok((await get("/portal/admin/export/students")).status === 404, "export needs login");
ok((await get("/pay/KCOE-XXXX")).status !== 200, "pay page needs login");

// --- Student
const st = await cookieFor(E("student2"));
for (const p of ["/portal/student", "/portal/student/registration", "/portal/student/courses", "/portal/student/results", "/portal/student/fees", "/portal/student/timetable", "/portal/student/profile", "/portal/student/support", "/portal/student/notifications"]) {
  const r = await get(p, st); ok(r.status === 200, `student ${p} -> ${r.status}`);
}
ok((await get("/portal/admin", st)).status === 404, "student cannot open admin");
ok((await get("/portal/staff", st)).status === 404, "student cannot open staff portal");
ok((await get("/portal/admin/export/students", st)).status === 404, "student cannot export");
const res8 = await get("/portal/student/results", await cookieFor(E("student8")));
ok(res8.text.includes("Cumulative GPA"), "continuing student sees CGPA");
const res2 = await get("/portal/student/results", st);
ok(res2.text.includes("No published results") || !res2.text.includes("KSCOE/DEMO/0008"), "student results show only own data");
const other = await one("SELECT reference FROM payments WHERE status='SUCCESSFUL' ORDER BY id LIMIT 1");
ok((await get(`/portal/student/fees/receipt/${other.reference}`, st)).status === 404, "cannot view someone else's receipt");
ok((await get(`/pay/${other.reference}`, st)).status === 404, "cannot open someone else's payment");

// --- Lecturer / HOD
const lec = await cookieFor(E("lecturer"));
for (const p of ["/portal/staff", "/portal/staff/courses", "/portal/staff/history", "/portal/staff/notifications"]) ok((await get(p, lec)).status === 200, `lecturer ${p}`);
const mine = await one("SELECT a.course_id FROM allocations a JOIN staff s ON s.id=a.staff_id JOIN users u ON u.id=s.user_id JOIN semesters m ON m.id=a.semester_id WHERE u.email=$1 AND m.is_current=1", E("lecturer"));
const theirs = await one("SELECT a.course_id FROM allocations a JOIN staff s ON s.id=a.staff_id JOIN users u ON u.id=s.user_id JOIN semesters m ON m.id=a.semester_id WHERE u.email=$1 AND m.is_current=1", E("lecturer2"));
ok((await get(`/portal/staff/courses/${mine.course_id}`, lec)).status === 200, "lecturer opens own class list");
ok((await get(`/portal/staff/courses/${theirs.course_id}`, lec)).status === 404, "lecturer cannot open another lecturer's class list");
ok((await get("/portal/staff/approvals", lec)).status === 404, "lecturer cannot approve");
ok((await get("/portal/admin", lec)).status === 404, "lecturer cannot open admin");
const hod = await cookieFor(E("hod"));
ok((await get("/portal/staff/approvals", hod)).status === 200, "HOD opens approvals");
ok((await get("/portal/staff/approvals", hod)).text.includes("BCH"), "HOD sees submitted course");

// --- Admin roles
const perms = {
  registrar: { yes: ["/portal/admin", "/portal/admin/students", "/portal/admin/registrations", "/portal/admin/results", "/portal/admin/programmes", "/portal/admin/reports"], no: ["/portal/admin/users", "/portal/admin/fees", "/portal/admin/audit", "/portal/admin/cms"] },
  bursary: { yes: ["/portal/admin", "/portal/admin/fees", "/portal/admin/students"], no: ["/portal/admin/registrations", "/portal/admin/results", "/portal/admin/users", "/portal/admin/cms"] },
  webadmin: { yes: ["/portal/admin", "/portal/admin/cms", "/portal/admin/cms/new?type=news", "/portal/admin/programmes"], no: ["/portal/admin/fees", "/portal/admin/users", "/portal/admin/audit", "/portal/admin/students"] },
  editor: { yes: ["/portal/admin/cms"], no: ["/portal/admin/programmes", "/portal/admin/users", "/portal/admin/fees"] },
  ict: { yes: ["/portal/admin/users", "/portal/admin/audit", "/portal/admin/settings"], no: ["/portal/admin/students", "/portal/admin/fees", "/portal/admin/results", "/portal/admin/roles"] },
  super: { yes: ["/portal/admin/users", "/portal/admin/roles", "/portal/admin/audit", "/portal/admin/settings"], no: ["/portal/admin/students", "/portal/admin/fees", "/portal/admin/results", "/portal/admin/cms"] },
  exams: { yes: ["/portal/admin/results", "/portal/admin/students"], no: ["/portal/admin/users", "/portal/admin/fees", "/portal/admin/cms"] },
};
for (const [who, { yes, no }] of Object.entries(perms)) {
  const c = await cookieFor(E(who));
  for (const p of yes) { const r = await get(p, c); ok(r.status === 200, `${who} ${p} -> ${r.status}`); }
  for (const p of no) { const r = await get(p, c); ok(r.status === 404, `${who} must not open ${p} (${r.status})`); }
}
const csv = await get("/portal/admin/export/students", await cookieFor(E("registrar")));
ok(csv.status === 200 && csv.text.startsWith("Matric no"), "registrar exports students");
ok((await get("/portal/admin/export/payments", await cookieFor(E("registrar")))).status === 404, "registrar cannot export payments");
ok((await get("/portal/admin/export/payments", await cookieFor(E("bursary")))).status === 200, "bursary exports payments");

// --- Payment webhook
const body = JSON.stringify({ reference: "KCOE-NOPE", amount_kobo: 100, status: "success" });
const secret = process.env.GATEWAY_SECRET || "dev-only-secret";
const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
const post = (b, s) => fetch(base + "/api/payments/webhook", { method: "POST", body: b, headers: { "x-signature": s ?? "" } });
ok((await post(body, "")).status === 401, "webhook rejects missing signature");
ok((await post(body, "ab".repeat(32))).status === 401, "webhook rejects wrong signature");
ok((await post(body, sig)).status === 422, "webhook signed but unknown reference is rejected");
ok((await post("not json", crypto.createHmac("sha256", secret).update("not json").digest("hex"))).status === 400, "webhook rejects bad payload");

// --- Login rate limiting is covered by unit tests; confirm the login page never leaks a session
ok(!(await get("/portal/login")).text.includes("kcoe_session"), "no session in login page");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
