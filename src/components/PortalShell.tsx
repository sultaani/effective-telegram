import Link from "next/link";
import { Logo } from "./bits";
import { PortalNav, type NavItem } from "./PortalNav";
import { logoutAction } from "../app/actions/auth";
import { ROLE_LABELS, type Role } from "../lib/permissions";
import { one } from "../db";

export type { NavItem };

export async function PortalShell({ title, nav, user, roles, children }: { title: string; nav: NavItem[]; user: { id: number; name: string }; roles: Role[]; children: React.ReactNode }) {
  const unread = (await one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL", user.id))!.n;
  const items = nav.map((n) => (n.href.endsWith("/notifications") ? { ...n, badge: unread } : n));
  return (
    <div data-surface="portal" className="pshell">
      <a href="#main" className="skip">Skip to main content</a>
      <header className="ptop">
        <div className="inner">
          <Link href="/" className="brand" aria-label="KCOE public website">
            <Logo size={40} />
            <span><strong>KCOE {title}</strong><span>Kogi State College of Education, Ankpa</span></span>
          </Link>
          <div className="who"><span className="uname">{user.name} <span className="role">· {roles.map((r) => ROLE_LABELS[r]).join(", ")}</span></span>
            <form action={logoutAction}><button type="submit">Sign out</button></form></div>
        </div>
      </header>
      <div className="pbody">
        <nav className="pnav" aria-label={`${title} navigation`}><PortalNav items={items} /></nav>
        <details className="pmenu"><summary>Menu</summary><nav aria-label={`${title} navigation (mobile)`}><PortalNav items={items} mobile /></nav></details>
        <main id="main" className="pmain">
          <div className="print-head"><Logo size={56} /><div><strong>Kogi State College of Education, Ankpa</strong><div className="small">{user.name}</div></div></div>
          {children}
        </main>
      </div>
    </div>
  );
}
