import type { Metadata } from "next";
import { PageHead } from "../../../components/PageHead";
import { listPublished } from "../../../services/cms";

export const metadata: Metadata = { title: "Frequently asked questions", alternates: { canonical: "/faq" } };

export default function Faq() {
  const faqs = listPublished("faq");
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.title, acceptedAnswer: { "@type": "Answer", text: f.summary } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <PageHead title="Frequently asked questions" crumbs={[["Questions"]]} />
      <div className="container section" style={{ maxWidth: 800 }}>
        {faqs.map((f) => <details key={f.id} className="panel" style={{ marginBottom: "var(--space-3)" }}><summary style={{ fontWeight: 600, cursor: "pointer", minHeight: 32 }}>{f.title}</summary><p style={{ margin: "var(--space-3) 0 0" }}>{f.summary}</p></details>)}
      </div>
    </>
  );
}
