import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "../../../components/PageHead";
import { listPublished } from "../../../services/cms";
import { dateOnly } from "../../../lib/format";
import { Empty } from "../../../components/bits";

export const metadata: Metadata = { title: "News", description: "News and announcements from Kogi State College of Education, Ankpa.", alternates: { canonical: "/news" } };

export default function News() {
  const notices = listPublished("announcement");
  const news = listPublished("news");
  return (
    <>
      <PageHead title="News and announcements" crumbs={[["News"]]} />
      <div className="container section sidebar-layout">
        <div>
          <h2>News</h2>
          {news.length === 0 ? <Empty title="No news yet">Check back soon.</Empty> : news.map((n) => (
            <Link key={n.id} className="item" href={`/news/${n.slug}`}><time dateTime={new Date(n.published_at!).toISOString()}>{dateOnly(n.published_at)}</time><h3>{n.title}</h3><p className="muted" style={{ margin: 0 }}>{n.summary}</p></Link>
          ))}
        </div>
        <aside>
          <h2>Announcements</h2>
          {notices.length === 0 ? <p className="muted">No announcements.</p> : notices.map((n) => <div key={n.id} className="panel"><h3>{n.title}</h3><p className="small muted" style={{ margin: 0 }}>{dateOnly(n.published_at)}. {n.summary}</p></div>)}
        </aside>
      </div>
    </>
  );
}
