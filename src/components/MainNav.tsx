"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "../lib/site-nav";

const Chevron = () => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;

export function MainNav() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const close = () => { setOpen(null); setMobile(false); setSearch(false); };
  useEffect(() => { close(); }, [path]);
  useEffect(() => { if (search) searchInput.current?.focus(); }, [search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(null); setSearch(false); } };
    document.addEventListener("keydown", onKey); document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, []);
  const isActive = (s: (typeof NAV)[number]) => (s.href ? (s.href === "/" ? path === "/" : path === s.href) : (s.groups ?? []).some((g) => g.items.some((l) => !l.external && (path === l.href || path.startsWith(l.href + "/")))));
  return (
    <div ref={ref} className="mainnav-wrap">
      <nav aria-label="Main" className={`mn ${mobile ? "is-open" : ""}`}>
        <ul id="mn-list" className="mn-list">
          {NAV.map((s, idx) => (
            <li key={s.label} className="mn-item" onMouseEnter={() => window.matchMedia("(min-width: 1041px)").matches && s.groups && (setSearch(false), setOpen(idx))} onMouseLeave={() => window.matchMedia("(min-width: 1041px)").matches && setOpen(null)}>
              {s.href ? (
                <Link href={s.href} className="mn-top" aria-current={isActive(s) ? "page" : undefined}>{s.label}</Link>
              ) : (
                <>
                  <button type="button" className="mn-top" aria-expanded={open === idx} aria-haspopup="true" data-active={isActive(s) || undefined} onClick={() => { setSearch(false); setOpen(open === idx ? null : idx); }}>
                    {s.label}<Chevron />
                  </button>
                  {/* Panels stay in the page (crawlable, no-JS friendly) and are closed with the hidden attribute. */}
                  <div className="mn-panel" role="group" aria-label={s.label} hidden={open !== idx}>
                    {s.groups!.map((g, gi) => (
                      <div key={gi} className="mn-col">
                        {g.heading && <p className="mn-heading">{g.heading}</p>}
                        <ul>{g.items.map((l) => (
                          <li key={l.href + l.label}>
                            {l.external
                              ? <a href={l.href} target="_blank" rel="noopener noreferrer" className="mn-leaf">{l.label}<span className="sr-only"> (opens in a new tab)</span></a>
                              : <Link href={l.href} className="mn-leaf">{l.label}</Link>}
                          </li>
                        ))}</ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <div className="mn-tools">
        <button type="button" className="mn-search-btn" aria-label="Search the site" aria-expanded={search} onClick={() => { setOpen(null); setSearch((v) => !v); }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" /></svg>
        </button>
        <Link href="/portal/login" className="btn small mn-portal">Portal</Link>
        <button type="button" className="mn-burger" aria-expanded={mobile} aria-controls="mn-list" onClick={() => { setSearch(false); setMobile((v) => !v); }}>
          <span className="mn-burger-bars" aria-hidden="true" />{mobile ? "Close" : "Menu"}
        </button>
      </div>
      <div className="mn-search" hidden={!search}>
        <form role="search" onSubmit={(e) => { e.preventDefault(); const q = new FormData(e.currentTarget).get("q"); if (typeof q === "string" && q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`); }}>
          <label htmlFor="site-q" className="sr-only">Search the site</label>
          <input id="site-q" ref={searchInput} name="q" type="search" placeholder="Search programmes, news and pages" autoComplete="off" />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>
    </div>
  );
}
