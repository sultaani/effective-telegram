"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, type NavLeaf } from "../lib/site-nav";

const ICONS = [
  "M12 3 2 9l10 6 8-4.8V17h2V9L12 3Zm-6 9.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.5L12 17l-6-4.5Z",
  "M4 4h16v13H4V4Zm2 2v9h12V6H6Zm-2 13h16v2H4v-2Z",
  "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v6h-2V7Zm0 8h2v2h-2v-2Z",
  "M5 3h14v18l-7-4-7 4V3Z",
  "M3 5h18v2H3V5Zm0 6h18v2H3v-2Zm0 6h12v2H3v-2Z",
  "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z",
  "M19 3H5a2 2 0 0 0-2 2v14l4-4h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z",
  "M12 2 3 7v2h18V7l-9-5ZM5 11v7H3v2h18v-2h-2v-7h-2v7h-2v-7h-2v7h-2v-7H9v7H7v-7H5Z",
];
export const NavIcon = ({ i }: { i: number }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" fill="currentColor"><path d={ICONS[i % ICONS.length]} /></svg>
);

function Leaf({ item, i, onNavigate }: { item: NavLeaf; i: number; onNavigate: () => void }) {
  const inner = <><span className="mn-ico"><NavIcon i={i} /></span><span>{item.label}</span></>;
  return item.external
    ? <a href={item.href} target="_blank" rel="noopener noreferrer" className="mn-leaf" onClick={onNavigate}>{inner}<span className="sr-only"> (opens in a new tab)</span></a>
    : <Link href={item.href} className="mn-leaf" onClick={onNavigate}>{inner}</Link>;
}

export function MainNav() {
  const path = usePathname();
  const [open, setOpen] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => { setOpen(null); setMobile(false); };
  useEffect(() => { close(); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, []);
  const isActive = (s: (typeof NAV)[number]) => (s.href ? (s.href === "/" ? path === "/" : path === s.href) : (s.groups ?? []).some((g) => g.items.some((l) => !l.external && (path === l.href || path.startsWith(l.href + "/")))));
  return (
    <div ref={ref} className="mainnav-wrap">
      <button type="button" className="mn-burger" aria-expanded={mobile} aria-controls="mn-list" onClick={() => setMobile((v) => !v)}>
        <span className="mn-burger-bars" aria-hidden="true" />{mobile ? "Close" : "Menu"}
      </button>
      <nav aria-label="Main" className={`mn ${mobile ? "is-open" : ""}`}>
        <ul id="mn-list" className="mn-list">
          {NAV.map((s, idx) => (
            <li key={s.label} className="mn-item" onMouseEnter={() => !mobile && s.groups && setOpen(idx)} onMouseLeave={() => !mobile && setOpen(null)}>
              {s.href ? (
                <Link href={s.href} className="mn-top" aria-current={isActive(s) ? "page" : undefined}>{s.label}</Link>
              ) : (
                <>
                  <button type="button" className="mn-top" aria-expanded={open === idx} aria-haspopup="true" data-active={isActive(s) || undefined}
                    onClick={() => setOpen(open === idx ? null : idx)}>{s.label}<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg></button>
                  {(
                    <div className="mn-panel" role="group" aria-label={s.label} hidden={open !== idx}>
                      {s.groups!.map((g, gi) => (
                        <div key={gi} className="mn-col">
                          {g.heading && <p className="mn-heading">{g.heading}</p>}
                          <ul>{g.items.map((l, li) => <li key={l.href + l.label}><Leaf item={l} i={idx + gi + li} onNavigate={close} /></li>)}</ul>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
