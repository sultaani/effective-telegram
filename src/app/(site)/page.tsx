import Link from "next/link";
import { getPublished, listPublished } from "../../services/cms";
import { listSchools } from "../../services/academics";
import { dateOnly } from "../../lib/format";
import { PHOTO } from "../../lib/images";
import { Photo } from "../../components/Photo";
import { SITE } from "../../lib/site-config";

const STUDY = [
  ["Prospective students", "/admissions"], ["NCE programmes", "/nce-programmes"], ["Degree programme", "/degree-programme"],
  ["Post-Degree Diploma (PDE)", "/pde-programme"], ["How to apply", "/how-to-apply"],
] as const;
const FALLBACK = [PHOTO.classroom, PHOTO.walkway, PHOTO.library, PHOTO.benchLaptops];

export default async function Home() {
  const [news, notices, events, schools, testimonials, provost] = await Promise.all([
    await listPublished("news", { limit: 3 }), await listPublished("announcement", { limit: 1 }), await listPublished("event", { limit: 3 }),
    await listSchools(), await listPublished("testimonial", { limit: 3 }), await getPublished("page", "provost-welcome"),
  ]);
  const ld = {
    "@context": "https://schema.org", "@type": "CollegeOrUniversity", name: "Kogi State College of Education, Ankpa",
    url: process.env.APP_URL || "http://localhost:3000", address: { "@type": "PostalAddress", addressLocality: "Ankpa", addressRegion: "Kogi State", addressCountry: "NG" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <section className="hero" aria-labelledby="hero-h">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero.jpg" alt="The administrative building of Kogi State College of Education, Ankpa" className="hero-img" width={1025} height={408} fetchPriority="high" decoding="async" />
        <div className="container hero-body">
          <div className="hero-card">
            <p className="eyebrow">Ankpa, Kogi State</p>
            <h1 id="hero-h">Learn to teach. Learn to lead.</h1>
            <p className="lead">Kogi State College of Education, Ankpa prepares teachers for the classrooms of Kogi State and beyond.</p>
            <div className="row"><Link className="btn" href="/how-to-apply">How to apply</Link><Link className="btn secondary" href="/programmes">Explore programmes</Link></div>
          </div>
        </div>
        {notices[0] && <Link href="/news#announcements" className="hero-chip"><strong>Notice</strong><span>{notices[0].title}</span></Link>}
      </section>

      <div className="container findbar">
        <form action="/programmes" role="search" aria-labelledby="find-h">
          <h2 id="find-h">Find the right programme for you</h2>
          <div className="field"><label htmlFor="fq">Programme or department</label><input id="fq" name="q" type="search" placeholder="For example: Biology" /></div>
          <div className="field"><label htmlFor="fs">School</label><select id="fs" name="school" defaultValue=""><option value="">All schools</option>{schools.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></div>
          <button className="btn" type="submit">Search programmes</button>
        </form>
      </div>

      <section className="welcome" aria-labelledby="welcome-h">
        <div className="container">
          <h2 id="welcome-h">Welcome to KCOE</h2>
          <div className="welcome-photo"><Photo src={provost?.image_url ?? "/images/provost.webp"} alt={`${SITE.provost.title}, ${SITE.provost.name}`} w={400} /></div>
          <p className="welcome-text">{provost?.summary ?? "Welcome to Kogi State College of Education, Ankpa."}</p>
          <p className="welcome-name">{SITE.provost.title}, {SITE.provost.name}</p>
          <p className="welcome-more"><Link className="arrowlink" href="/provost-welcome">Read the full message</Link></p>
        </div>
      </section>

      <section className="section alt" aria-labelledby="study-h">
        <div className="container">
          <div className="study">
            <div className="study-img"><Photo src={PHOTO.teacher} alt="A teacher standing in front of a class of pupils" w={1000} /></div>
            <div className="study-body">
              <p className="kicker">Study with us</p>
              <h2 id="study-h" style={{ fontWeight: 300 }}>Study at KCOE</h2>
              <p className="muted" style={{ marginBottom: 0 }}>From the Nigeria Certificate in Education to the degree and post-degree routes, find the path that fits your teaching career.</p>
              <ul className="study-list">{STUDY.map(([l, h]) => <li key={l}><Link href={h}>{l}</Link></li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="section" aria-labelledby="say-h">
          <div className="container">
            <div className="section-head"><div><p className="kicker">Student voices</p><h2 id="say-h">What our students say</h2></div></div>
            <div className="say">
              {testimonials.map((t) => (
                <figure key={t.id} className="say-card" style={{ margin: 0 }}>
                  <blockquote style={{ margin: 0, flex: 1 }}><q>{t.summary}</q></blockquote>
                  <figcaption className="say-who">{t.image_url && <Photo src={t.image_url} alt="" w={120} className="" />}<div><strong>{t.title}</strong><span>{t.body}</span></div></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section alt" aria-labelledby="schools-h">
        <div className="container">
          <div className="section-head"><div><p className="kicker">Academics</p><h2 id="schools-h">Our schools</h2></div><Link className="arrowlink" href="/schools">All schools</Link></div>
          {schools.length === 0 ? <p className="muted">Schools will be listed here once they are added.</p> : <div className="tiles">{schools.map((s) => <Link key={s.id} className="tile" href={`/schools/${s.slug}`}><h3>{s.name}</h3><p>{s.summary}</p></Link>)}</div>}
        </div>
      </section>

      <section className="section" aria-labelledby="news-h">
        <div className="container">
          <div className="section-head"><div><p className="kicker">News</p><h2 id="news-h">Latest news</h2></div><Link className="arrowlink" href="/news">View all news</Link></div>
          {news.length === 0 && <p className="muted">No news has been published yet.</p>}
          <div className="newsgrid">
            {news.map((n, i) => (
              <Link key={n.id} href={`/news/${n.slug}`} className="ncard">
                <Photo src={n.image_url ?? FALLBACK[i % FALLBACK.length]} alt="" w={700} />
                <time dateTime={new Date(n.published_at!).toISOString()}>{dateOnly(n.published_at)}</time><h3>{n.title}</h3><p>{n.summary}</p>
              </Link>
            ))}
          </div>
          {events.length > 0 && (
            <div className="evlist" aria-label="Upcoming events">
              {events.map((e) => {
                const dt = e.event_date ? new Date(e.event_date + "T00:00:00") : null;
                return (
                  <div key={e.id} className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                    <div className="datebox">{dt ? dt.getDate() : "–"}<span>{dt ? dt.toLocaleString("en-GB", { month: "short" }) : ""}</span></div>
                    <div><Link href="/events"><strong>{e.title}</strong></Link><div className="small muted">{e.event_location}</div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
