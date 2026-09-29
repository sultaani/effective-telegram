import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublished } from "../../../services/cms";
import { PageHead } from "../../../components/PageHead";
import { Prose } from "../../../lib/markdown";
import { Alert } from "../../../components/bits";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const p = getPublished("page", slug);
  if (!p) return {};
  return { title: p.title, description: p.seo_description || p.summary, alternates: { canonical: `/${p.slug}` }, openGraph: { title: p.title, description: p.summary } };
}

export default async function CmsPage({ params }: P) {
  const { slug } = await params;
  const p = getPublished("page", slug);
  if (!p) notFound();
  return (
    <>
      <PageHead title={p.title} lead={p.summary} />
      <div className="container section">
        <div className="narrow" style={{ margin: 0 }}>
          {p.verification === "AWAITING_CONFIRMATION" && <Alert kind="warn" title="Awaiting confirmation">Some details on this page have not yet been confirmed by the college.</Alert>}
          <Prose text={p.body} />
        </div>
      </div>
    </>
  );
}
