import Link from "next/link";
import { Crest } from "./bits";
import { NavLink } from "./NavLink";
import { logoutAction } from "../app/actions/auth";
import { ROLE_LABELS, type Role } from "../lib/permissions";
import { one } from "../db";

export type NavItem = { href: string; label: string; group?: string; exact?: boolean; badge?: number };

export function PortalShell({ title, nav, user, roles, children }: { title: string; nav: NavItem[]; user: { id: number; name: string }; roles: Role[]; children: React.ReactNode }) {
  const unread = one<{ n: number }>("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND read_at IS NULL", user.id)!.n;
  const items = nav.map((n) => (n.href.endsWith("/notifications") ? { ...n, badge: unread } : n));
  const links = (mobile: boolean) => {
    let last = "";
    return items.map((n) => (
      <span key={n.href}>
        {!mobile && n.group && n.group !== last && (last = n.group) && <div className="group">{n.group}</div>}
        <NavLink href={n.href} exact={n.exact}>{n.label}{n.badge ? <span className="count" aria-label={`${n.badge} unread`}>{n.badge}</span> : null}</NavLink>
      </span>
    ));
  };
  return (
    <div data-surface="portal" className="pshell">
      <a href="#main" className="skip">Skip to main content</a>
      <header className="ptop">
        <div className="inner">
          <Link href="/" className="brand" aria-label="KCOE public website"><Crest size={36} /><span><span className="name" style={{ fontSize: "1rem" }}>KCOE {title}</span><br /><span className="place">Kogi State College of Education, Ankpa</span></span></Link>
          <div className="who"><span className="uname">{user.name} · {roles.map((r) => ROLE_LABELS[r]).join(", ")}</span>
            <form action={logoutAction}><button type="submit">Sign out</button></form></div>
        </div>
      </header>
      <div className="pbody">
        <nav className="pnav" aria-label={`${title} navigation`}>{links(false)}</nav>
        <details className="pmenu"><summary>Menu</summary><nav aria-label={`${title} navigation (mobile)`}>{links(true)}</nav></details>
        <main id="main" className="pmain">{children}</main>
      </div>
    </div>
  );
}
