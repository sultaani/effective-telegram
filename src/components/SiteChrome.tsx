import Link from "next/link";
import { Crest } from "./bits";
import { MainNav } from "./MainNav";
import { UTILITY } from "../lib/site-nav";

export function SiteHeader() {
  return (
    <>
      <a href="#main" className="skip">Skip to main content</a>
      <div className="utility">
        <div className="container">
          <span className="small muted utility-tag">Ankpa, Kogi State, Nigeria</span>
          <nav aria-label="Quick links"><ul>{UTILITY.map((l) => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul></nav>
        </div>
      </div>
      <header className="sitehead">
        <div className="container sitehead-row">
          <Link href="/" className="brand" aria-label="Kogi State College of Education, Ankpa: home">
            <Crest size={48} />
            <span><span className="name">Kogi State College of Education</span><span className="place">Ankpa</span></span>
          </Link>
          <MainNav />
          <form action="/search" role="search" className="hsearch">
            <label htmlFor="q" className="sr-only">Search the site</label>
            <input id="q" name="q" type="search" placeholder="Search" autoComplete="off" />
            <button type="submit" aria-label="Search"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" /></svg></button>
          </form>
        </div>
      </header>
    </>
  );
}

const SOCIAL = [
  ["Facebook", "https://www.facebook.com/kscoeankpa/", "M13 22v-8h3l1-4h-4V8c0-1 .4-2 2-2h2V2.2C16.6 2.1 15.5 2 14.3 2 11.6 2 9 3.7 9 7v3H6v4h3v8h4Z"],
] as const;

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="container">
        <div className="foot-grid">
          <div>
            <h2>Quick links</h2>
            <ul>
              <li><Link href="/how-to-apply">How to apply</Link></li><li><Link href="/programmes">Find a programme</Link></li>
              <li><Link href="/academic-calendar">Academic calendar</Link></li><li><Link href="/portal/login">Student portal</Link></li><li><Link href="/contact">Contact us</Link></li>
            </ul>
          </div>
          <div>
            <h2>Information for</h2>
            <ul>
              <li><Link href="/nce-programmes">Prospective students</Link></li><li><Link href="/portal/login">Current students</Link></li>
              <li><Link href="/portal/login">Lecturers and staff</Link></li><li><Link href="/faq">Parents and guardians</Link></li><li><Link href="/news">Media</Link></li>
            </ul>
          </div>
          <div>
            <h2>Information about</h2>
            <ul>
              <li><Link href="/schools">Schools</Link></li><li><Link href="/research-and-publications">Research</Link></li><li><Link href="/about/leadership">Leadership</Link></li>
              <li><Link href="/tetfund-high-impact">TETFund</Link></li><li><Link href="/downloads">Downloads</Link></li>
            </ul>
          </div>
          <div>
            <h2>Our location</h2>
            <address>Kogi State College of Education<br />Ankpa, Kogi State<br />Nigeria</address>
            <p><a href="mailto:info@kscoeankpa.edu.ng">info@kscoeankpa.edu.ng</a></p>
            <ul className="social" aria-label="Social media">
              {SOCIAL.map(([n, href, d]) => <li key={n}><a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Find us on ${n}`}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={d} /></svg></a></li>)}
            </ul>
          </div>
        </div>
        <div className="foot-legal">
          <ul>
            <li><Link href="/accessibility">Accessibility</Link></li><li><Link href="/terms">Terms and conditions</Link></li>
            <li><Link href="/privacy">Privacy</Link></li><li><Link href="/servicom">Servicom</Link></li><li><Link href="/sitemap.xml">Sitemap</Link></li><li><Link href="/contact">Contact us</Link></li>
          </ul>
          <p>© {new Date().getFullYear()} Kogi State College of Education, Ankpa</p>
        </div>
      </div>
    </footer>
  );
}
