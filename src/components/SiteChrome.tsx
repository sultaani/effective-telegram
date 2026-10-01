import Link from "next/link";
import { Logo } from "./bits";
import { MainNav } from "./MainNav";
import { SITE } from "../lib/site-config";

export function SiteHeader() {
  return (
    <>
      <a href="#main" className="skip">Skip to main content</a>
      <header className="sitehead">
        <div className="container sitehead-row">
          <Link href="/" className="brand" aria-label={`${SITE.name}, ${SITE.place}: home`}>
            <Logo size={46} />
            <span className="brand-name">{SITE.name.replace(" College", "")}<br />College of Education<br />{SITE.place}</span>
          </Link>
          <MainNav />
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="container">
        <div className="foot-row">
          <Link href="/" className="foot-brand" aria-label="Home">
            <Logo size={56} />
            <span><strong>{SITE.name}</strong><span>{SITE.place}, Kogi State</span></span>
          </Link>
          <address className="foot-contact">
            {SITE.address}<br />
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>{SITE.phone && <> · <a href={`tel:${SITE.phone}`}>{SITE.phone}</a></>}
          </address>
          {SITE.socials.length > 0 && (
            <ul className="social" aria-label="Social media">
              {SITE.socials.map((s) => <li key={s.name}><a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${SITE.name} on ${s.name}`}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={s.path} /></svg></a></li>)}
            </ul>
          )}
        </div>
        <p className="foot-copy">© {new Date().getFullYear()} {SITE.name}, {SITE.place}</p>
      </div>
    </footer>
  );
}
