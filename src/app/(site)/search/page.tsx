import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "../../../components/PageHead";
import { publicSearch } from "../../../services/cms";
import { Empty, str } from "../../../components/bits";

export const metadata: Metadata = { title: "Search", robots: { index: false } };
const PATH: Record<string, string> = { page: "", news: "/news", event: "/events", announcement: "/news", faq: "/faq", download: "/downloads" };

export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = (str((await searchParams).q) ?? "").trim().slice(0, 80);
  const r = q.length >= 2 ? await publicSearch(q) : null;
  const total = r ? r.content.length + r.programmes.length + r.schools.length : 0;
  return (
    <>
      <PageHead title="Search" crumbs={[["Search"]]} />
      <div className="container section" style={{ maxWidth: 800 }}>
        <form role="search" className="row" style={{ marginBottom: "24px" }}>
          <label htmlFor="sq" className="sr-only">Search the site</label>
          <input id="sq" name="q" type="search" defaultValue={q} style={{ flex: 1, minWidth: 200 }} /><button className="btn" type="submit">Search</button>
        </form>
        {!r ? <p className="muted">Enter at least two letters.</p> : total === 0 ? <Empty title={`No results for “${q}”`}>Try another word, or browse <Link href="/programmes">programmes</Link>.</Empty> : (
          <div aria-live="polite">
            <p className="muted">{total} result{total === 1 ? "" : "s"}</p>
            {r.schools.map((s) => <Link key={s.slug} className="item" href={`/schools/${s.slug}`}><h3>{s.name}</h3><span className="meta">School</span></Link>)}
            {r.programmes.map((p) => <Link key={p.slug} className="item" href={`/programmes/${p.slug}`}><h3>{p.title}</h3><span className="meta">Programme · {p.award} · {p.department}</span></Link>)}
            {r.content.map((c) => <Link key={c.id} className="item" href={c.type === "news" ? `/news/${c.slug}` : c.type === "page" ? `/${c.slug}` : PATH[c.type] || "/"}><h3>{c.title}</h3><span className="meta">{c.type}</span><p className="muted" style={{ margin: 0 }}>{c.summary}</p></Link>)}
          </div>
        )}
      </div>
    </>
  );
}
