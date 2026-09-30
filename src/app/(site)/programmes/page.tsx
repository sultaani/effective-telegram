import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "../../../components/PageHead";
import { listProgrammes, listSchools } from "../../../services/academics";
import { Empty, str } from "../../../components/bits";

export const metadata: Metadata = { title: "Programmes", description: "Browse NCE and diploma programmes at Kogi State College of Education, Ankpa.", alternates: { canonical: "/programmes" } };

export default async function Programmes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = str(sp.q), school = str(sp.school), award = str(sp.award);
  const rows = await listProgrammes({ q, school, award });
  return (
    <>
      <PageHead title="Programmes" crumbs={[["Programmes"]]} lead="Search by name or department, or narrow by school and award." />
      <div className="container section">
        <form className="filters" role="search" aria-label="Filter programmes">
          <div className="field"><label htmlFor="q">Programme or department</label><input id="q" name="q" type="search" defaultValue={q} /></div>
          <div className="field"><label htmlFor="school">School</label><select id="school" name="school" defaultValue={school ?? ""}><option value="">All schools</option>{(await listSchools()).map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select></div>
          <div className="field"><label htmlFor="award">Award</label><select id="award" name="award" defaultValue={award ?? ""}><option value="">Any</option><option>NCE</option><option>PDE</option></select></div>
          <button className="btn" type="submit">Apply filters</button>
        </form>
        <p className="muted" aria-live="polite">{rows.length} programme{rows.length === 1 ? "" : "s"} found.</p>
        {rows.length === 0 ? <Empty title="No programmes match">Try a shorter search or clear the filters. <Link href="/programmes">Show all programmes</Link></Empty> : (
          <div className="grid cols-2">
            {rows.map((p) => (
              <Link key={p.id} href={`/programmes/${p.slug}`} className="schoolcard">
                <h2 style={{ fontSize: "1.2rem" }}>{p.title}</h2>
                <p className="small muted" style={{ margin: "0 0 var(--space-3)" }}>{p.school} · {p.department}</p>
                <div className="row"><span className="badge info">{p.award}</span><span className="small">{p.duration_years} {p.duration_years === 1 ? "year" : "years"}</span></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
