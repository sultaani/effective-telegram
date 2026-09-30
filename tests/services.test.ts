import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { Actor, Role } from "../src/lib/permissions";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgres://kcoe:kcoe@localhost:5433/kcoe_test";
(process.env as Record<string, string>).NODE_ENV = "test";

let q: typeof import("../src/db");
let reg: typeof import("../src/services/registration");
let res: typeof import("../src/services/results");
let fees: typeof import("../src/services/fees");
let cms: typeof import("../src/services/cms");
let users: typeof import("../src/services/users");
let acad: typeof import("../src/services/academics");
let hook: typeof import("../src/services/webhook");
let pay: typeof import("../src/lib/payments");

async function actorOf(email: string): Promise<Actor> {
  const u = (await q.one<{ id: number }>("SELECT id FROM users WHERE lower(email)=lower(?)", email))!;
  const roles = (await q.all<{ role: Role }>("SELECT role FROM user_roles WHERE user_id=?", u.id)).map((r) => r.role);
  const st = await q.one<{ id: number; department_id: number }>("SELECT id,department_id FROM staff WHERE user_id=?", u.id);
  const s = await q.one<{ id: number }>("SELECT id FROM students WHERE user_id=?", u.id);
  return { userId: u.id, roles, departmentIds: st ? [st.department_id] : [], staffId: st?.id, studentId: s?.id };
}
const E = (n: string) => `${n}@demo.kcoe.test`;

beforeAll(async () => {
  await import("../src/db/seed"); // wipes and reseeds the TEST database
  await new Promise((r) => setTimeout(r, 3000));
  q = await import("../src/db");
  reg = await import("../src/services/registration"); res = await import("../src/services/results"); fees = await import("../src/services/fees");
  cms = await import("../src/services/cms"); users = await import("../src/services/users"); acad = await import("../src/services/academics");
  hook = await import("../src/services/webhook"); pay = await import("../src/lib/payments");
}, 60000);
afterAll(async () => { await q.closeDb(); });

describe("course registration", () => {
  it("blocks missing compulsory courses, foreign courses and bad unit totals", async () => {
    const st = await actorOf(E("student6"));
    const v = (await reg.registrationView(st.studentId!))!;
    expect(v.status).toBe("NOT_STARTED");
    const compulsory = v.courses.filter((c) => c.is_compulsory).map((c) => c.id);
    expect(await reg.saveRegistration(st.studentId!, st.userId, compulsory.slice(1), true)).toMatchObject({ ok: false });
    const foreign = (await q.one<{ id: number }>("SELECT id FROM courses WHERE level=200 LIMIT 1"))!.id;
    expect(await reg.saveRegistration(st.studentId!, st.userId, [...compulsory, foreign], false)).toMatchObject({ ok: false });
    expect(await reg.saveRegistration(st.studentId!, st.userId, compulsory, true)).toMatchObject({ ok: false }); // 12 units: below minimum
  });
  it("accepts a valid submission and then locks it", async () => {
    const st = await actorOf(E("student6"));
    const all = (await reg.registrationView(st.studentId!))!.courses.map((c) => c.id);
    expect(await reg.saveRegistration(st.studentId!, st.userId, all, true)).toMatchObject({ ok: true });
    expect((await reg.registrationView(st.studentId!))!.status).toBe("SUBMITTED");
    expect(await reg.saveRegistration(st.studentId!, st.userId, all, true)).toMatchObject({ ok: false });
  });
  it("registrar approval notifies the student", async () => {
    const st = await actorOf(E("student6")), r = await actorOf(E("registrar"));
    expect(await reg.decideRegistration(r.userId, st.studentId!, true)).toMatchObject({ ok: true });
    expect((await q.one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND kind='registration'", st.userId))!.n).toBe(1);
  });
});

describe("results workflow and access control", () => {
  it("only the allocated lecturer sees a class list (no IDOR)", async () => {
    const l1 = await actorOf(E("lecturer")), l2 = await actorOf(E("lecturer2")), sem = (await acad.currentSemester())!;
    const course = (await res.assignedCourses(l1.staffId!, sem.id))[0];
    expect(await res.classList(l1, course.course_id, sem.id)).not.toBeNull();
    expect(await res.classList(l2, course.course_id, sem.id)).toBeNull();
    const regId = (await res.classList(l1, course.course_id, sem.id))![0].registration_id;
    expect(await res.saveScores(l2, [{ registrationId: regId, ca: 10, exam: 10 }])).toMatchObject({ ok: false });
  });
  it("rejects out-of-range scores", async () => {
    const l1 = await actorOf(E("lecturer")), sem = (await acad.currentSemester())!;
    const course = (await res.assignedCourses(l1.staffId!, sem.id))[1];
    const rows = (await res.classList(l1, course.course_id, sem.id))!;
    expect(await res.saveScores(l1, [{ registrationId: rows[0].registration_id, ca: 99, exam: 10 }])).toMatchObject({ ok: false });
    expect(await res.submitCourseResults(l1, course.course_id, sem.id)).toMatchObject({ ok: false });
  });
  it("runs lecturer → HOD → examinations office → student, and only then shows results", async () => {
    const l1 = await actorOf(E("lecturer")), hod = await actorOf(E("hod")), ex = await actorOf(E("exams")), st = await actorOf(E("student2")), sem = (await acad.currentSemester())!;
    const course = (await res.assignedCourses(l1.staffId!, sem.id))[1];
    const rows = (await res.classList(l1, course.course_id, sem.id))!;
    expect(await res.saveScores(l1, rows.map((r) => ({ registrationId: r.registration_id, ca: 25, exam: 50 })))).toMatchObject({ ok: true });
    expect(await res.submitCourseResults(l1, course.course_id, sem.id)).toMatchObject({ ok: true });
    const other = (await q.one<{ id: number }>("SELECT id FROM departments WHERE name='English'"))!.id;
    expect(await res.decideCourse({ ...hod, departmentIds: [other] }, course.course_id, sem.id, "approve")).toMatchObject({ ok: false });
    expect(await res.decideCourse(l1, course.course_id, sem.id, "approve")).toMatchObject({ ok: false });
    expect(await res.decideCourse(hod, course.course_id, sem.id, "publish")).toMatchObject({ ok: false });
    expect((await res.studentResults(st.studentId!)).semesters.length).toBe(0);
    expect(await res.decideCourse(hod, course.course_id, sem.id, "approve")).toMatchObject({ ok: true });
    expect((await res.studentResults(st.studentId!)).semesters.length).toBe(0);
    expect(await res.decideCourse(ex, course.course_id, sem.id, "publish")).toMatchObject({ ok: true });
    const out = await res.studentResults(st.studentId!);
    expect(out.semesters[0].rows[0].grade).toBe("A");
    expect(out.cgpa).toBe(5);
  });
  it("carries CGPA across semesters for continuing students", async () => {
    const st = await actorOf(E("student8"));
    const r = await res.studentResults(st.studentId!);
    expect(r.semesters.length).toBe(2);
    expect(r.semesters[1].cgpa).toBe(r.cgpa);
  });
});

describe("payments", () => {
  it("only lets a student pay their own invoice", async () => {
    const a = await actorOf(E("student2")), b = await actorOf(E("student3"));
    const inv = (await fees.studentInvoices(a.studentId!))[0];
    expect(await fees.initiatePayment(b.studentId!, inv.id)).toMatchObject({ ok: false });
    expect(await fees.initiatePayment(a.studentId!, inv.id)).toMatchObject({ ok: true });
  });
  it("settles once, verifies the amount, and never double counts", async () => {
    const a = await actorOf(E("student3"));
    const inv = (await fees.studentInvoices(a.studentId!))[0];
    const ref = ((await fees.initiatePayment(a.studentId!, inv.id)) as { ok: true; value: string }).value;
    expect(await fees.settlePayment(ref, 100, "success", "GW1")).toMatchObject({ ok: false });
    expect((await fees.studentInvoices(a.studentId!))[0].balance_kobo).toBe(inv.amount_kobo);
    const [r1, r2] = await Promise.all([fees.settlePayment(ref, inv.amount_kobo, "success", "GW1"), fees.settlePayment(ref, inv.amount_kobo, "success", "GW1")]);
    expect([r1, r2].filter((r) => r.ok && r.value === "settled").length).toBe(1); // concurrent webhooks settle exactly once
    const after = (await fees.studentInvoices(a.studentId!))[0];
    expect(after.paid_kobo).toBe(inv.amount_kobo); expect(after.balance_kobo).toBe(0);
    expect(await fees.receipt(a.studentId!, ref)).toBeTruthy();
    expect(await fees.receipt((await actorOf(E("student2"))).studentId!, ref)).toBeUndefined();
    expect(await fees.initiatePayment(a.studentId!, inv.id)).toMatchObject({ ok: false });
  });
  it("marks failed payments without crediting", async () => {
    const a = await actorOf(E("student5"));
    const inv = (await fees.studentInvoices(a.studentId!))[0];
    const ref = ((await fees.initiatePayment(a.studentId!, inv.id)) as { ok: true; value: string }).value;
    await fees.settlePayment(ref, inv.amount_kobo, "failed", "GW2");
    expect((await fees.studentInvoices(a.studentId!))[0].paid_kobo).toBe(0);
    expect(await fees.settlePayment("nope", 1, "success", "x")).toMatchObject({ ok: false });
  });
  it("webhook handler rejects bad signatures and payloads", async () => {
    const body = JSON.stringify({ reference: "KCOE-NOPE", amount_kobo: 100, status: "success" });
    expect((await hook.processWebhook(body, null)).status).toBe(401);
    expect((await hook.processWebhook(body, "ab".repeat(32))).status).toBe(401);
    expect((await hook.processWebhook(body, pay.sign(body))).status).toBe(422);
    expect((await hook.processWebhook("nope", pay.sign("nope"))).status).toBe(400);
  });
});

describe("CMS workflow", () => {
  it("lets editors draft and submit for review but not publish or edit live content", async () => {
    const ed = await actorOf(E("editor")), wa = await actorOf(E("webadmin"));
    const id = ((await cms.saveContent(ed, { type: "news", title: "Test story", summary: "s", body: "b", audience: "public" })) as { ok: true; value: number }).value;
    expect(await cms.transition(ed, id, "REVIEW")).toMatchObject({ ok: true });
    expect(await cms.transition(ed, id, "PUBLISHED")).toMatchObject({ ok: false });
    expect(await cms.transition(wa, id, "PUBLISHED")).toMatchObject({ ok: true });
    expect(await cms.saveContent(ed, { id, type: "news", title: "Changed", summary: "", body: "", audience: "public" })).toMatchObject({ ok: false });
    expect(await cms.setVerification(ed, id, "VERIFIED")).toMatchObject({ ok: false });
    expect(await cms.setVerification(wa, id, "VERIFIED")).toMatchObject({ ok: true });
    expect((await cms.getPublished("news", "test-story"))?.title).toBe("Test story");
  });
  it("rejects unsafe image addresses", async () => {
    const wa = await actorOf(E("webadmin"));
    expect(await cms.saveContent(wa, { type: "news", title: "Img", summary: "", body: "", audience: "public", image_url: "javascript:alert(1)" })).toMatchObject({ ok: false });
    expect(await cms.saveContent(wa, { type: "news", title: "Img ok", summary: "", body: "", audience: "public", image_url: "https://images.unsplash.com/photo-1" })).toMatchObject({ ok: true });
  });
  it("hides drafts and staff-only items from the public", async () => {
    expect((await cms.listPublished("news")).some((n) => n.slug === "draft-hostel-allocation")).toBe(false);
    expect((await cms.listPublished("announcement")).some((n) => n.audience === "staff")).toBe(false);
    expect(await cms.getPublished("announcement", "staff-result-meetings")).toBeUndefined();
  });
  it("rejects duplicate slugs and keeps testimonials out of search", async () => {
    const wa = await actorOf(E("webadmin"));
    expect(await cms.saveContent(wa, { type: "news", title: "x", slug: "orientation-week-for-new-students", summary: "", body: "", audience: "public" })).toMatchObject({ ok: false });
    expect((await cms.publicSearch("library")).content.some((c) => c.type === "testimonial")).toBe(false);
    expect((await cms.publicSearch("%")).content.length).toBe(0); // wildcard is escaped
  });
});

describe("user administration", () => {
  it("stops privilege escalation", async () => {
    const ict = await actorOf(E("ict")), sup = await actorOf(E("super"));
    expect(await users.createStaffUser(ict, { name: "X", email: "x@demo.kcoe.test", roles: ["SUPER_ADMIN"] })).toMatchObject({ ok: false });
    const made = await users.createStaffUser(ict, { name: "Clerk", email: "clerk@demo.kcoe.test", roles: ["REGISTRAR"] });
    expect(made).toMatchObject({ ok: true });
    expect(await users.setRoles(ict, (made as { ok: true; value: { id: number } }).value.id, ["SUPER_ADMIN"])).toMatchObject({ ok: false });
    expect(await users.setActive(sup, sup.userId, false)).toMatchObject({ ok: false });
    expect(await users.createStaffUser(await actorOf(E("registrar")), { name: "Y", email: "y@demo.kcoe.test", roles: ["REGISTRAR"] })).toMatchObject({ ok: false });
    expect(await users.createStaffUser(ict, { name: "Dup", email: "CLERK@demo.kcoe.test", roles: ["REGISTRAR"] })).toMatchObject({ ok: false }); // emails are case-insensitive
  });
  it("audits sensitive actions", async () => {
    expect((await q.one<{ n: number }>("SELECT COUNT(*) n FROM audit_log WHERE action IN ('user.create','results.publish','cms.published')"))!.n).toBeGreaterThan(2);
  });
});
