import { PortalShell, type NavItem } from "../../../components/PortalShell";
import { requireSession } from "../../../lib/auth";
import { ADMIN_ROLES, can, type Permission } from "../../../lib/permissions";

const ALL: (NavItem & { perm?: Permission })[] = [
  { href: "/portal/admin", label: "Dashboard", exact: true, group: "Overview" },
  { href: "/portal/admin/notifications", label: "Notifications", group: "Overview" },
  { href: "/portal/admin/students", label: "Students", group: "Academic records", perm: "students:read" },
  { href: "/portal/admin/registrations", label: "Course registrations", group: "Academic records", perm: "registration:approve" },
  { href: "/portal/admin/results", label: "Results publication", group: "Academic records", perm: "results:publish" },
  { href: "/portal/admin/programmes", label: "Programmes", group: "Academic records", perm: "programmes:manage" },
  { href: "/portal/admin/fees", label: "Fees and payments", group: "Finance", perm: "fees:manage" },
  { href: "/portal/admin/cms", label: "Website content", group: "Website", perm: "cms:draft" },
  { href: "/portal/admin/users", label: "Users", group: "System", perm: "users:manage" },
  { href: "/portal/admin/roles", label: "Roles and permissions", group: "System", perm: "roles:manage" },
  { href: "/portal/admin/settings", label: "Academic settings", group: "System", perm: "config:manage" },
  { href: "/portal/admin/audit", label: "Audit log", group: "System", perm: "audit:read" },
  { href: "/portal/admin/reports", label: "Reports", group: "System", perm: "reports:view" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await requireSession(ADMIN_ROLES);
  const nav = ALL.filter((n) => !n.perm || can(s.actor, n.perm));
  return <PortalShell title="Administration" nav={nav} user={s.user} roles={s.actor.roles}>{children}</PortalShell>;
}
