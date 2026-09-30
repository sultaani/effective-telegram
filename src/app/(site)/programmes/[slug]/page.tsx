import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "../../../../components/PageHead";
import { coursesOfProgramme, getProgramme } from "../../../../services/academics";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getProgramme((await params).slug);
  return p ? { title: `${p.title} (${p.award})`, description: p.summary, alternates: { canonical: `/programmes/${p.slug}` } } : {};
}

export default async function Programme({ params }: P) {
  const p = await getProgramme((await params).slug);
  if (!p) notFound();
  const courses = await coursesOfProgramme(p.id);
  const ld = { "@context": "https://schema.org", "@type": "EducationalOccupationalProgram", name: p.title, provider: { "@type": "CollegeOrUniversity", name: "Kogi State College of Education, Ankpa" } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PageHead title={p.title} crumbs={[["Programmes", "/programmes"], [p.title]]} lead={`${p.award} · ${p.duration_years} ${p.duration_years === 1 ? "year" : "years"} · ${p.department}, ${p.school}`} />
      <div className="container section sidebar-layout">
        <div>
          <h2>About this programme</h2><p>{p.summary}</p>
          <h2>Entry requirements</h2><p>{p.entry_requirements}</p>
          <h2>Courses</h2>
          {courses.length === 0 ? <p className="muted">The course list for this programme has not been published yet.</p> : (
            <div className="table-wrap"><table className="table stack-sm"><thead><tr><th>Code</th><th>Course</th><th>Level</th><th>Semester</th><th className="num">Units</th></tr></thead>
              <tbody>{courses.map((c) => <tr key={c.id}><td data-label="Code">{c.code}</td><td data-label="Course">{c.title}{!c.is_compulsory && " (elective)"}</td><td data-label="Level">{c.level}</td><td data-label="Semester">{c.semester_no}</td><td data-label="Units" className="num">{c.units}</td></tr>)}</tbody></table></div>
          )}
        </div>
        <aside className="panel" style={{ alignSelf: "start" }}>
          <h2>Ready to apply?</h2><p className="small">Read the admissions steps, then contact the Admissions Office if you have questions.</p>
          <Link className="btn" href="/admissions">Admissions steps</Link>
        </aside>
      </div>
    </>
  );
}
