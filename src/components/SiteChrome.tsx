import Link from "next/link";
import { Crest } from "./bits";
import { NavLink } from "./NavLink";

const NAV: [string, string][] = [["/about", "About"], ["/schools", "Schools"], ["/programmes", "Programmes"], ["/admissions", "Admissions"], ["/news", "News"], ["/events", "Events"], ["/contact", "Contact"]];

export function SiteHeader() {
  return (
    <>
      <a href="#main" className="skip">Skip to main content</a>
      <div className="brandbar" aria-hidden="true" />
      <div className="utility">
        <div className="container">
          <nav aria-label="Portals"><Link href="/portal/login">Student portal</Link><Link href="/portal/login">Staff portal</Link><Link href="/faq">Help</Link></nav>
          <form action="/search" role="search" className="row" style={{ gap: 8 }}>
            <label htmlFor="q" className="sr-only">Search the site</label>
            <input id="q" name="q" type="search" placeholder="Search the site" style={{ minHeight: 32, width: 200, padding: "2px 8px" }} />
            <button className="btn small" type="submit" style={{ background: "var(--kcoe-blue)", borderColor: "var(--kcoe-blue)" }}>Search</button>
          </form>
        </div>
      </div>
      <header className="sitehead">
        <div className="container">
          <Link href="/" className="brand" aria-label="Kogi State College of Education, Ankpa: home">
            <Crest />
            <span><span className="name">Kogi State College of Education</span><br /><span className="place">Ankpa, Kogi State</span></span>
          </Link>
          <nav className="mainnav" aria-label="Main">{NAV.map(([h, l]) => <NavLink key={h} href={h}>{l}</NavLink>)}</nav>
          <details className="menu-toggle">
            <summary>Menu</summary>
            <nav aria-label="Main (mobile)">{NAV.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}<Link href="/portal/login">Portal sign-in</Link></nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="container">
        <div className="grid cols-4">
          <div><h2>Kogi State College of Education, Ankpa</h2><p className="small muted">A public teacher-training institution owned by the Kogi State Government.</p></div>
          <div><h2>Study</h2><ul><li><Link href="/programmes">Programmes</Link></li><li><Link href="/schools">Schools</Link></li><li><Link href="/admissions">Admissions</Link></li></ul></div>
          <div><h2>Community</h2><ul><li><Link href="/news">News</Link></li><li><Link href="/events">Events</Link></li><li><Link href="/downloads">Downloads</Link></li><li><Link href="/about/leadership">Leadership</Link></li></ul></div>
          <div><h2>Help</h2><ul><li><Link href="/portal/login">Portal sign-in</Link></li><li><Link href="/faq">Questions</Link></li><li><Link href="/contact">Contact</Link></li><li><Link href="/sitemap.xml">Sitemap</Link></li></ul></div>
        </div>
        <p className="demo-note">Demonstration build. Programmes, staff, fees, dates and news are sample content, and the crest is a placeholder, until the college confirms its own. Pages marked “Awaiting confirmation” need the college’s approval before launch.</p>
      </div>
    </footer>
  );
}
