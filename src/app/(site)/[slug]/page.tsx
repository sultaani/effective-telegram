import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublished } from "../../../services/cms";
import { PageHead } from "../../../components/PageHead";
import { Prose } from "../../../lib/markdown";
import { sectionFor } from "../../../lib/site-nav";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPublished("page", (await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.seo_description || p.summary, alternates: { canonical: `/${p.slug}` }, openGraph: { title: p.title, description: p.summary } };
}

export default async function CmsPage({ params }: P) {
  const { slug } = await params;
  const p = await getPublished("page", slug);
  if (!p) notFound();
  const side = sectionFor(`/${slug}`);
  return (
    <>
      <PageHead title={p.title} lead={p.summary} image={p.image_url} crumbs={side ? [[side.title]] : []} />
      <div className={`container section ${side ? "sidebar-layout" : ""}`} style={side ? { gridTemplateColumns: "1fr 260px" } : undefined}>
        <article><Prose text={p.body} /></article>
        {side && <nav className="side-nav" aria-label="In this section"><h2>{side.title}</h2>{side.items.map((i) => <Link key={i.href} href={i.href} aria-current={i.href === `/${slug}` ? "page" : undefined}>{i.label}</Link>)}</nav>}
      </div>
    </>
  );
}
