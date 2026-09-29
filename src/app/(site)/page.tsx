import Link from "next/link";
import { listPublished } from "../../services/cms";
import { listSchools } from "../../services/academics";
import { dateOnly } from "../../lib/format";

export default function Home() {
  const news = listPublished("news", { limit: 4 });
  const notices = listPublished("announcement", { limit: 1 });
  const events = listPublished("event", { limit: 3 });
  const schools = listSchools();
  const ld = {
    "@context": "https://schema.org", "@type": "CollegeOrUniversity", name: "Kogi State College of Education, Ankpa",
    url: process.env.APP_URL || "http://localhost:3000", address: { "@type": "PostalAddress", addressLocality: "Ankpa", addressRegion: "Kogi State", addressCountry: "NG" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      {notices[0] && (
        <div className="notice"><div className="container"><strong>Notice</strong><span>{notices[0].title}. {notices[0].summary}</span><Link href="/admissions">Admissions</Link></div></div>
      )}
      <section className="hero">
        <div className="container">
          <div>
            <p className="small" style={{ color: "var(--kcoe-green)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Ankpa, Kogi State</p>
            <h1>Teacher education you can build a career on</h1>
            <p className="lead">Kogi State College of Education, Ankpa trains teachers through NCE programmes across five schools. Find a programme, check how to apply, or sign in to your portal.</p>
            <div className="row"><Link className="btn" href="/admissions">How to apply</Link><Link className="btn secondary" href="/portal/login">Portal sign-in</Link></div>
          </div>
          <form className="finder" action="/programmes" role="search" aria-labelledby="finder-h">
            <h2 id="finder-h">Find a programme</h2>
            <div className="field"><label htmlFor="fq">Programme or department</label><input id="fq" name="q" type="search" placeholder="For example: Biology" /></div>
            <div className="field"><label htmlFor="fs">School</label>
              <select id="fs" name="school" defaultValue=""><option value="">All schools</option>{schools.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></div>
            <button className="btn" type="submit">Search programmes</button>
          </form>
        </div>
      </section>

      <section className="section" aria-labelledby="paths-h">
        <div className="container">
          <h2 id="paths-h" className="sr-only">Where do you want to go?</h2>
          <div className="pathways">
            <Link href="/programmes"><strong>Prospective students</strong>Browse programmes and entry requirements.</Link>
            <Link href="/admissions"><strong>Apply</strong>Steps to apply and what you need.</Link>
            <Link href="/portal/login"><strong>Current students</strong>Register courses, see results, pay fees.</Link>
            <Link href="/portal/login"><strong>Lecturers and staff</strong>Class lists, scores and approvals.</Link>
            <Link href="/faq"><strong>Parents and guardians</strong>Answers to common questions.</Link>
          </div>
        </div>
      </section>

      <section className="section alt" aria-labelledby="schools-h">
        <div className="container">
          <div className="section-head"><h2 id="schools-h">Our schools</h2><Link href="/schools">All schools</Link></div>
          <div className="grid cols-3">{schools.map((s) => <Link key={s.id} className="schoolcard" href={`/schools/${s.slug}`}><h3>{s.name}</h3><p className="muted small" style={{ margin: 0 }}>{s.summary}</p></Link>)}</div>
        </div>
      </section>

      <section className="section" aria-labelledby="news-h">
        <div className="container sidebar-layout">
          <div>
            <div className="section-head"><h2 id="news-h">Latest news</h2><Link href="/news">All news</Link></div>
            {news.length === 0 ? <p className="muted">No news yet.</p> : news.map((n) => (
              <Link key={n.id} className="item" href={`/news/${n.slug}`}><time dateTime={new Date(n.published_at!).toISOString()}>{dateOnly(n.published_at)}</time><h3>{n.title}</h3><p className="muted" style={{ margin: 0 }}>{n.summary}</p></Link>
            ))}
          </div>
          <aside aria-labelledby="ev-h">
            <div className="section-head"><h2 id="ev-h" style={{ fontSize: "1.4rem" }}>Upcoming events</h2></div>
            {events.length === 0 ? <p className="muted">No upcoming events.</p> : events.map((e) => {
              const dt = e.event_date ? new Date(e.event_date + "T00:00:00") : null;
              return (
                <div key={e.id} className="row" style={{ alignItems: "flex-start", marginBottom: "var(--space-4)" }}>
                  <div className="datebox">{dt ? dt.getDate() : "–"}<span>{dt ? dt.toLocaleString("en-GB", { month: "short" }) : ""}</span></div>
                  <div><Link href="/events"><strong>{e.title}</strong></Link><div className="small muted">{e.event_location}</div></div>
                </div>
              );
            })}
            <Link href="/events">All events</Link>
          </aside>
        </div>
      </section>
    </>
  );
}
