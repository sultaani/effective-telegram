import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import type { Actor, Role } from "../src/lib/permissions";

process.env.DATABASE_FILE = "/tmp/kcoe-test.db";
for (const s of ["", "-wal", "-shm"]) if (fs.existsSync("/tmp/kcoe-test.db" + s)) fs.rmSync("/tmp/kcoe-test.db" + s);

let q: typeof import("../src/db");
let actorOf: (email: string) => Actor;
let reg: typeof import("../src/services/registration");
let res: typeof import("../src/services/results");
let fees: typeof import("../src/services/fees");
let cms: typeof import("../src/services/cms");
let users: typeof import("../src/services/users");
let acad: typeof import("../src/services/academics");

beforeAll(async () => {
  await import("../src/db/seed");
  q = await import("../src/db");
  reg = await import("../src/services/registration");
  res = await import("../src/services/results");
  fees = await import("../src/services/fees");
  cms = await import("../src/services/cms");
  users = await import("../src/services/users");
  acad = await import("../src/services/academics");
  actorOf = (email) => {
    const u = q.one<{ id: number }>("SELECT id FROM users WHERE email=?", email)!;
    const roles = q.all<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=?", u.id).map((r) => r.role);
    const st = q.one<{ id: number; department_id: number }>("SELECT id,department_id FROM staff WHERE user_id=?", u.id);
    const s = q.one<{ id: number }>("SELECT id FROM students WHERE user_id=?", u.id);
    return { userId: u.id, roles, departmentIds: st ? [st.department_id] : [], staffId: st?.id, studentId: s?.id };
  };
});

const E = (n: string) => `${n}@demo.kcoe.test`;

describe("course registration", () => {
  it("blocks missing compulsory courses, foreign courses and bad unit totals", () => {
    const st = actorOf(E("student6"));
    const v = reg.registrationView(st.studentId!)!;
    expect(v.status).toBe("NOT_STARTED");
    const compulsory = v.courses.filter((c) => c.is_compulsory).map((c) => c.id);
    expect(reg.saveRegistration(st.studentId!, st.userId, compulsory.slice(1), true)).toMatchObject({ ok: false });
    const foreign = q.one<{ id: number }>("SELECT id FROM courses WHERE level=200 LIMIT 1")!.id;
    expect(reg.saveRegistration(st.studentId!, st.userId, [...compulsory, foreign], false)).toMatchObject({ ok: false });
    expect(reg.saveRegistration(st.studentId!, st.userId, compulsory, true)).toMatchObject({ ok: false }); // 15 units? check below
  });
  it("accepts a valid submission and then locks it", () => {
    const st = actorOf(E("student6"));
    const all = reg.registrationView(st.studentId!)!.courses.map((c) => c.id);
    expect(reg.saveRegistration(st.studentId!, st.userId, all, true)).toMatchObject({ ok: true });
    expect(reg.registrationView(st.studentId!)!.status).toBe("SUBMITTED");
    expect(reg.saveRegistration(st.studentId!, st.userId, all, true)).toMatchObject({ ok: false });
  });
  it("registrar approval notifies the student", () => {
    const st = actorOf(E("student6")), r = actorOf(E("registrar"));
    expect(reg.decideRegistration(r.userId, st.studentId!, true)).toMatchObject({ ok: true });
    expect(q.one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND kind='registration'", st.userId)!.n).toBe(1);
  });
});

describe("results workflow and access control", () => {
  const sem = () => acad.currentSemester()!;
  it("only the allocated lecturer sees a class list (no IDOR)", () => {
    const l1 = actorOf(E("lecturer")), l2 = actorOf(E("lecturer2"));
    const course = res.assignedCourses(l1.staffId!, sem().id)[0];
    expect(res.classList(l1, course.course_id, sem().id)).not.toBeNull();
    expect(res.classList(l2, course.course_id, sem().id)).toBeNull();
    const regId = res.classList(l1, course.course_id, sem().id)![0].registration_id;
    expect(res.saveScores(l2, [{ registrationId: regId, ca: 10, exam: 10 }])).toMatchObject({ ok: false });
  });
  it("rejects out-of-range scores and locks submitted rows", () => {
    const l1 = actorOf(E("lecturer"));
    const course = res.assignedCourses(l1.staffId!, sem().id)[1];
    const rows = res.classList(l1, course.course_id, sem().id)!;
    expect(res.saveScores(l1, [{ registrationId: rows[0].registration_id, ca: 99, exam: 10 }])).toMatchObject({ ok: false });
    expect(res.submitCourseResults(l1, course.course_id, sem().id)).toMatchObject({ ok: false }); // nothing scored yet
  });
  it("runs lecturer → HOD → examinations office → student, and only then shows results", () => {
    const l1 = actorOf(E("lecturer")), hod = actorOf(E("hod")), ex = actorOf(E("exams")), st = actorOf(E("student2"));
    const course = res.assignedCourses(l1.staffId!, sem().id)[1];
    const rows = res.classList(l1, course.course_id, sem().id)!;
    expect(res.saveScores(l1, rows.map((r) => ({ registrationId: r.registration_id, ca: 25, exam: 50 })))).toMatchObject({ ok: true });
    expect(res.submitCourseResults(l1, course.course_id, sem().id)).toMatchObject({ ok: true });
    // A HOD from another department cannot approve
    const outsider: Actor = { ...hod, departmentIds: [q.one<{ id: number }>("SELECT id FROM departments WHERE name='English'")!.id] };
    expect(res.decideCourse(outsider, course.course_id, sem().id, "approve")).toMatchObject({ ok: false });
    // Lecturers cannot approve or publish
    expect(res.decideCourse(l1, course.course_id, sem().id, "approve")).toMatchObject({ ok: false });
    expect(res.decideCourse(hod, course.course_id, sem().id, "publish")).toMatchObject({ ok: false });
    expect(res.studentResults(st.studentId!).semesters.length).toBe(0);
    expect(res.decideCourse(hod, course.course_id, sem().id, "approve")).toMatchObject({ ok: true });
    expect(res.studentResults(st.studentId!).semesters.length).toBe(0); // approved but not published
    expect(res.decideCourse(ex, course.course_id, sem().id, "publish")).toMatchObject({ ok: true });
    const out = res.studentResults(st.studentId!);
    expect(out.semesters[0].rows[0].grade).toBe("A");
    expect(out.cgpa).toBe(5);
  });
  it("carries CGPA across semesters for continuing students", () => {
    const st = actorOf(E("student8"));
    const r = res.studentResults(st.studentId!);
    expect(r.semesters.length).toBe(2);
    expect(r.semesters[1].cgpa).toBe(r.cgpa);
  });
});

describe("payments", () => {
  it("only lets a student pay their own invoice", () => {
    const a = actorOf(E("student2")), b = actorOf(E("student3"));
    const inv = fees.studentInvoices(a.studentId!)[0];
    expect(fees.initiatePayment(b.studentId!, inv.id)).toMatchObject({ ok: false });
    expect(fees.initiatePayment(a.studentId!, inv.id)).toMatchObject({ ok: true });
  });
  it("settles once, verifies the amount, and never double counts", () => {
    const a = actorOf(E("student3"));
    const inv = fees.studentInvoices(a.studentId!)[0];
    const ref = (fees.initiatePayment(a.studentId!, inv.id) as { ok: true; value: string }).value;
    expect(fees.settlePayment(ref, 100, "success", "GW1")).toMatchObject({ ok: false }); // wrong amount
    expect(fees.studentInvoices(a.studentId!)[0].balance_kobo).toBe(inv.amount_kobo);
    expect(fees.settlePayment(ref, inv.amount_kobo, "success", "GW1")).toMatchObject({ ok: true, value: "settled" });
    expect(fees.settlePayment(ref, inv.amount_kobo, "success", "GW1")).toMatchObject({ ok: true, value: "already" });
    const after = fees.studentInvoices(a.studentId!)[0];
    expect(after.paid_kobo).toBe(inv.amount_kobo); expect(after.balance_kobo).toBe(0);
    expect(fees.receipt(a.studentId!, ref)).toBeTruthy();
    expect(fees.receipt(actorOf(E("student2")).studentId!, ref)).toBeUndefined();
    expect(fees.initiatePayment(a.studentId!, inv.id)).toMatchObject({ ok: false }); // already paid
  });
  it("marks failed payments without crediting", () => {
    const a = actorOf(E("student5"));
    const inv = fees.studentInvoices(a.studentId!)[0];
    const ref = (fees.initiatePayment(a.studentId!, inv.id) as { ok: true; value: string }).value;
    fees.settlePayment(ref, inv.amount_kobo, "failed", "GW2");
    expect(fees.studentInvoices(a.studentId!)[0].paid_kobo).toBe(0);
    expect(fees.settlePayment("nope", 1, "success", "x")).toMatchObject({ ok: false });
  });
});

describe("CMS workflow", () => {
  it("lets editors draft and submit for review but not publish or edit live content", () => {
    const ed = actorOf(E("editor")), wa = actorOf(E("webadmin"));
    const id = (cms.saveContent(ed, { type: "news", title: "Test story", summary: "s", body: "b", audience: "public" }) as { ok: true; value: number }).value;
    expect(cms.transition(ed, id, "REVIEW")).toMatchObject({ ok: true });
    expect(cms.transition(ed, id, "PUBLISHED")).toMatchObject({ ok: false });
    expect(cms.transition(wa, id, "PUBLISHED")).toMatchObject({ ok: true });
    expect(cms.saveContent(ed, { id, type: "news", title: "Changed", summary: "", body: "", audience: "public" })).toMatchObject({ ok: false });
    expect(cms.setVerification(ed, id, "VERIFIED")).toMatchObject({ ok: false });
    expect(cms.setVerification(wa, id, "VERIFIED")).toMatchObject({ ok: true });
    expect(cms.getPublished("news", "test-story")?.title).toBe("Test story");
  });
  it("hides drafts and staff-only items from the public", () => {
    expect(cms.listPublished("news").some((n) => n.slug === "demo-draft-story")).toBe(false);
    expect(cms.listPublished("announcement").some((n) => n.audience === "staff")).toBe(false);
    expect(cms.getPublished("announcement", "demo-staff-meeting")).toBeUndefined();
  });
  it("rejects duplicate slugs", () => {
    const wa = actorOf(E("webadmin"));
    expect(cms.saveContent(wa, { type: "news", title: "x", slug: "demo-orientation-week", summary: "", body: "", audience: "public" })).toMatchObject({ ok: false });
  });
});

describe("user administration", () => {
  it("stops privilege escalation", () => {
    const ict = actorOf(E("ict")), sup = actorOf(E("super"));
    expect(users.createStaffUser(ict, { name: "X", email: "x@demo.kcoe.test", roles: ["SUPER_ADMIN"] })).toMatchObject({ ok: false });
    const made = users.createStaffUser(ict, { name: "Clerk", email: "clerk@demo.kcoe.test", roles: ["REGISTRAR"] });
    expect(made).toMatchObject({ ok: true });
    expect(users.setRoles(ict, (made as { ok: true; value: { id: number } }).value.id, ["SUPER_ADMIN"])).toMatchObject({ ok: false });
    expect(users.setActive(sup, sup.userId, false)).toMatchObject({ ok: false });
    expect(users.createStaffUser(actorOf(E("registrar")), { name: "Y", email: "y@demo.kcoe.test", roles: ["REGISTRAR"] })).toMatchObject({ ok: false });
  });
  it("audits sensitive actions", () => {
    expect(q.one<{ n: number }>("SELECT COUNT(*) n FROM audit_log WHERE action IN ('user.create','results.publish','cms.published')")!.n).toBeGreaterThan(2);
  });
});
