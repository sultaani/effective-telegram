"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; group?: string; exact?: boolean; badge?: number };

const isActive = (path: string, i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));

/** Collapsible sidebar groups; the group holding the current page is open. */
export function PortalNav({ items, mobile = false }: { items: NavItem[]; mobile?: boolean }) {
  const path = usePathname();
  const groups = [...new Set(items.map((i) => i.group ?? ""))];
  const link = (i: NavItem) => (
    <Link key={i.href} href={i.href} aria-current={isActive(path, i) ? "page" : undefined}>
      {i.label}{i.badge ? <span className="count" aria-label={`${i.badge} unread`}>{i.badge}</span> : null}
    </Link>
  );
  if (mobile) return <>{groups.map((g) => <div key={g}>{g && <div className="group">{g}</div>}{items.filter((i) => (i.group ?? "") === g).map(link)}</div>)}</>;
  return (
    <>
      {groups.map((g) => {
        const list = items.filter((i) => (i.group ?? "") === g);
        return (
          <details key={g} className="pnav-group" open={list.some((i) => isActive(path, i)) || g === "Overview" || undefined}>
            <summary>{g || "Menu"}</summary>
            {list.map(link)}
          </details>
        );
      })}
    </>
  );
}
