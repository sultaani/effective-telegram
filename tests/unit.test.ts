import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, passwordProblem } from "../src/lib/password";
import { gradeFor, gpa, validateScores } from "../src/lib/grading";
import { can, canInDepartment, ROLES, ROLE_PERMISSIONS, homeFor } from "../src/lib/permissions";
import { toCsv } from "../src/lib/csv";
import { validateUpload } from "../src/lib/files";
import { sign, verifySignature } from "../src/lib/payments";
import { Prose } from "../src/lib/markdown";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

describe("passwords", () => {
  it("hashes with salt and verifies", () => {
    const h = hashPassword("Correct-horse-9");
    expect(h).not.toContain("Correct-horse-9");
    expect(hashPassword("Correct-horse-9")).not.toBe(h);
    expect(verifyPassword("Correct-horse-9", h)).toBe(true);
    expect(verifyPassword("wrong", h)).toBe(false);
  });
  it("rejects weak passwords", () => {
    expect(passwordProblem("short1")).toBeTruthy();
    expect(passwordProblem("allletterslong")).toBeTruthy();
    expect(passwordProblem("goodpassword1")).toBeNull();
  });
});

describe("grading", () => {
  it("maps totals to grades at the boundaries", () => {
    expect(gradeFor(70).grade).toBe("A"); expect(gradeFor(69.9).grade).toBe("B");
    expect(gradeFor(45).grade).toBe("D"); expect(gradeFor(39).grade).toBe("F");
  });
  it("computes unit-weighted GPA", () => {
    expect(gpa([{ units: 3, points: 5 }, { units: 2, points: 3 }])).toBe(4.2);
    expect(gpa([])).toBe(0);
  });
  it("validates score ranges", () => {
    expect(validateScores(31, 10)).toBeTruthy(); expect(validateScores(10, 71)).toBeTruthy();
    expect(validateScores(-1, 10)).toBeTruthy(); expect(validateScores(30, 70)).toBeNull();
    expect(validateScores(NaN, 10)).toBeTruthy();
  });
});

describe("permissions", () => {
  it("gives every role an entry and separates duties", () => {
    for (const r of ROLES) expect(ROLE_PERMISSIONS[r]).toBeDefined();
    expect(can({ roles: ["SUPER_ADMIN"] }, "results:publish")).toBe(false);
    expect(can({ roles: ["CONTENT_EDITOR"] }, "cms:publish")).toBe(false);
    expect(can({ roles: ["BURSARY_OFFICER"] }, "results:approve")).toBe(false);
    expect(can({ roles: ["WEBSITE_ADMIN"] }, "cms:publish")).toBe(true);
  });
  it("scopes HOD to own department", () => {
    const hod = { userId: 1, roles: ["HOD" as const], departmentIds: [5] };
    expect(canInDepartment(hod, "results:approve", 5)).toBe(true);
    expect(canInDepartment(hod, "results:approve", 6)).toBe(false);
  });
  it("routes roles to the right portal", () => {
    expect(homeFor(["STUDENT"])).toBe("/portal/student");
    expect(homeFor(["LECTURER"])).toBe("/portal/staff");
    expect(homeFor(["HOD", "LECTURER"])).toBe("/portal/staff");
    expect(homeFor(["REGISTRAR"])).toBe("/portal/admin");
  });
});

describe("csv, uploads, signatures, markdown", () => {
  it("neutralises formula injection and quotes", () => {
    expect(toCsv([["=cmd|calc", 'a"b', "x,y"]])).toBe(`'=cmd|calc,"a""b","x,y"`);
  });
  it("accepts real PDFs and rejects disguised files", () => {
    expect(validateUpload("a.pdf", Buffer.from("%PDF-1.4 hi")).ok).toBe(true);
    expect(validateUpload("a.pdf", Buffer.from("<script>")).ok).toBe(false);
    expect(validateUpload("a.exe", Buffer.from("MZ")).ok).toBe(false);
    expect(validateUpload("a.pdf", Buffer.alloc(6 * 1024 * 1024, 0x25)).ok).toBe(false);
  });
  it("verifies webhook signatures", () => {
    const body = '{"reference":"X","amount":100}';
    expect(verifySignature(body, sign(body))).toBe(true);
    expect(verifySignature(body + " ", sign(body))).toBe(false);
    expect(verifySignature(body, "zz")).toBe(false);
  });
  it("escapes HTML in CMS content", () => {
    const html = renderToStaticMarkup(React.createElement(Prose, { text: "<script>alert(1)</script>\n\n[x](javascript:alert(1))" }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain('href="javascript');
  });
});
