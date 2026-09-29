import { PortalShell, type NavItem } from "../../../components/PortalShell";
import { requireSession } from "../../../lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await requireSession(["LECTURER", "HOD", "DEAN"]);
  const nav: NavItem[] = [
    { href: "/portal/staff", label: "Dashboard", exact: true, group: "Overview" },
    { href: "/portal/staff/notifications", label: "Notifications", group: "Overview" },
    { href: "/portal/staff/courses", label: "My courses and scores", group: "Teaching" },
    { href: "/portal/staff/history", label: "Result history", group: "Teaching" },
  ];
  if (s.actor.roles.some((r) => r === "HOD" || r === "DEAN")) nav.push({ href: "/portal/staff/approvals", label: "Result approvals", group: "Department" });
  return <PortalShell title="Staff Portal" nav={nav} user={s.user} roles={s.actor.roles}>{children}</PortalShell>;
}
