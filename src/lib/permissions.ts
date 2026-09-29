/** Central RBAC definition. Enforce server-side in every page, action and route; hiding UI is cosmetic only. */
export const ROLES = [
  "STUDENT", "LECTURER", "HOD", "DEAN", "REGISTRAR", "ADMISSIONS_OFFICER", "BURSARY_OFFICER",
  "EXAM_OFFICER", "CONTENT_EDITOR", "WEBSITE_ADMIN", "ICT_ADMIN", "SUPER_ADMIN",
] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "cms:draft" | "cms:review" | "cms:publish" | "cms:verify"
  | "students:read" | "students:write" | "programmes:manage"
  | "registration:approve" | "allocation:manage"
  | "results:enter" | "results:approve" | "results:publish"
  | "fees:manage" | "payments:read" | "reports:view"
  | "users:manage" | "roles:manage" | "audit:read" | "config:manage";

/** SUPER_ADMIN manages access and configuration, not academic or financial data. */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  STUDENT: [],
  LECTURER: ["results:enter"],
  HOD: ["results:enter", "results:approve", "allocation:manage", "reports:view", "students:read"],
  DEAN: ["results:approve", "reports:view", "students:read"],
  REGISTRAR: ["students:read", "students:write", "registration:approve", "results:publish", "reports:view", "programmes:manage"],
  ADMISSIONS_OFFICER: ["students:read", "students:write"],
  BURSARY_OFFICER: ["fees:manage", "payments:read", "reports:view", "students:read"],
  EXAM_OFFICER: ["results:publish", "reports:view", "students:read"],
  CONTENT_EDITOR: ["cms:draft"],
  WEBSITE_ADMIN: ["cms:draft", "cms:review", "cms:publish", "cms:verify", "programmes:manage"],
  ICT_ADMIN: ["users:manage", "audit:read", "config:manage"],
  SUPER_ADMIN: ["users:manage", "roles:manage", "audit:read", "config:manage"],
};

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student", LECTURER: "Lecturer", HOD: "Head of Department", DEAN: "Dean of School", REGISTRAR: "Registrar",
  ADMISSIONS_OFFICER: "Admissions officer", BURSARY_OFFICER: "Bursary officer", EXAM_OFFICER: "Examinations officer",
  CONTENT_EDITOR: "Content editor", WEBSITE_ADMIN: "Website administrator", ICT_ADMIN: "ICT administrator", SUPER_ADMIN: "Super administrator",
};

export interface Actor {
  userId: number;
  roles: Role[];
  departmentIds: number[];
  studentId?: number;
  staffId?: number;
}

export function can(actor: Pick<Actor, "roles">, permission: Permission): boolean {
  return actor.roles.some((r) => ROLE_PERMISSIONS[r]?.includes(permission));
}

const INSTITUTION_WIDE: Role[] = ["REGISTRAR", "EXAM_OFFICER"];

/** Department-scoped check: HODs and lecturers act only inside their own department. */
export function canInDepartment(actor: Actor, permission: Permission, departmentId: number): boolean {
  if (!can(actor, permission)) return false;
  if (actor.roles.some((r) => INSTITUTION_WIDE.includes(r))) return true;
  return actor.departmentIds.includes(departmentId);
}

export const STAFF_ROLES: Role[] = ["LECTURER", "HOD", "DEAN"];
export const ADMIN_ROLES: Role[] = ROLES.filter((r) => r !== "STUDENT" && r !== "LECTURER") as Role[];

/** Which portal area a user lands in. */
export function homeFor(roles: Role[]): string {
  if (roles.some((r) => (ADMIN_ROLES as Role[]).includes(r) && r !== "HOD" && r !== "DEAN")) return "/portal/admin";
  if (roles.some((r) => STAFF_ROLES.includes(r))) return "/portal/staff";
  return "/portal/student";
}
