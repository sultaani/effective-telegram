import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "../../../components/PageHead";
import { listSchools, departmentsOf } from "../../../services/academics";

export const metadata: Metadata = { title: "Schools", description: "The five schools of Kogi State College of Education, Ankpa.", alternates: { canonical: "/schools" } };

export default function Schools() {
  return (
    <>
      <PageHead title="Schools" crumbs={[["Schools"]]} lead="Programmes are organised into five schools, each made up of departments." />
      <div className="container section grid cols-2">
        {listSchools().map((s) => (
          <Link key={s.id} href={`/schools/${s.slug}`} className="schoolcard">
            <h2>{s.name}</h2><p className="muted">{s.summary}</p>
            <p className="small" style={{ margin: 0 }}><strong>Departments:</strong> {departmentsOf(s.id).map((d) => d.name).join(", ")}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
