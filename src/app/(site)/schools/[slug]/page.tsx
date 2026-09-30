import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "../../../../components/PageHead";
import { getSchool, departmentsOf, listProgrammes } from "../../../../services/academics";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = await getSchool((await params).slug);
  return s ? { title: s.name, description: s.summary, alternates: { canonical: `/schools/${s.slug}` } } : {};
}

export default async function School({ params }: P) {
  const s = await getSchool((await params).slug);
  if (!s) notFound();
  const progs = await listProgrammes({ school: s.slug });
  return (
    <>
      <PageHead title={s.name} crumbs={[["Schools", "/schools"], [s.name]]} lead={s.summary} />
      <div className="container section sidebar-layout">
        <div>
          <h2>Programmes</h2>
          {progs.length === 0 ? <p className="muted">No programmes are listed for this school yet.</p> : progs.map((p) => (
            <Link key={p.id} className="item" href={`/programmes/${p.slug}`}><h3>{p.title}</h3><span className="meta">{p.award} · {p.duration_years} {p.duration_years === 1 ? "year" : "years"} · {p.department}</span></Link>
          ))}
        </div>
        <aside><h2>Departments</h2><ul>{(await departmentsOf(s.id)).map((d) => <li key={d.id}>{d.name}</li>)}</ul></aside>
      </div>
    </>
  );
}
