import { PortalShell, type NavItem } from "../../../components/PortalShell";
import { requireSession } from "../../../lib/auth";

const NAV: NavItem[] = [
  { href: "/portal/student", label: "Dashboard", exact: true, group: "Overview" },
  { href: "/portal/student/notifications", label: "Notifications", group: "Overview" },
  { href: "/portal/student/registration", label: "Course registration", group: "Academics" },
  { href: "/portal/student/courses", label: "Registered courses", group: "Academics" },
  { href: "/portal/student/results", label: "Results and GPA", group: "Academics" },
  { href: "/portal/student/timetable", label: "Timetable and calendar", group: "Academics" },
  { href: "/portal/student/fees", label: "Fees and receipts", group: "Finance" },
  { href: "/portal/student/profile", label: "Profile", group: "Account" },
  { href: "/portal/student/support", label: "Support", group: "Account" },
];

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await requireSession(["STUDENT"]);
  return <PortalShell title="Student Portal" nav={NAV} user={s.user} roles={s.actor.roles}>{children}</PortalShell>;
}
