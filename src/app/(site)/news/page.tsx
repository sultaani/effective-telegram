import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "../../../components/PageHead";
import { Photo } from "../../../components/Photo";
import { listPublished } from "../../../services/cms";
import { dateOnly } from "../../../lib/format";
import { PHOTO } from "../../../lib/images";
import { Empty } from "../../../components/bits";

export const metadata: Metadata = { title: "News", description: "News and announcements from Kogi State College of Education, Ankpa.", alternates: { canonical: "/news" } };
const FALLBACK = [PHOTO.classroom, PHOTO.walkway, PHOTO.library, PHOTO.benchLaptops, PHOTO.graduate, PHOTO.teacher];

export default async function News() {
  const [notices, news] = await Promise.all([listPublished("announcement"), listPublished("news")]);
  return (
    <>
      <PageHead title="News and announcements" crumbs={[["News"]]} />
      <div className="container section">
        {news.length === 0 ? <Empty title="No news yet">Check back soon.</Empty> : (
          <div className="newsgrid">
            {news.map((n, i) => (
              <Link key={n.id} className="ncard" href={`/news/${n.slug}`}>
                <Photo src={n.image_url ?? FALLBACK[i % FALLBACK.length]} alt="" w={700} />
                <time dateTime={new Date(n.published_at!).toISOString()}>{dateOnly(n.published_at)}</time><h3>{n.title}</h3><p>{n.summary}</p>
              </Link>
            ))}
          </div>
        )}
        <section id="announcements" style={{ marginTop: "64px" }} aria-labelledby="ann-h">
          <h2 id="ann-h">Announcements</h2>
          {notices.length === 0 ? <p className="muted">No announcements.</p> : notices.map((n) => <div key={n.id} className="item"><h3 style={{ color: "var(--text)" }}>{n.title}</h3><p className="small muted" style={{ margin: 0 }}>{dateOnly(n.published_at)}. {n.summary}</p></div>)}
        </section>
      </div>
    </>
  );
}
