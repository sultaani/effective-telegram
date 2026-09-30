import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHead } from "../../../../components/PageHead";
import { getPublished } from "../../../../services/cms";
import { Prose } from "../../../../lib/markdown";
import { dateOnly } from "../../../../lib/format";
import { PHOTO } from "../../../../lib/images";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const n = await getPublished("news", (await params).slug);
  return n ? { title: n.title, description: n.seo_description || n.summary, alternates: { canonical: `/news/${n.slug}` },
    openGraph: { type: "article", title: n.title, description: n.summary, publishedTime: n.published_at ? new Date(n.published_at).toISOString() : undefined } } : {};
}

export default async function Article({ params }: P) {
  const n = await getPublished("news", (await params).slug);
  if (!n) notFound();
  return (
    <>
      <PageHead title={n.title} crumbs={[["News", "/news"], [n.title]]} lead={`Published ${dateOnly(n.published_at)}`} image={n.image_url ?? PHOTO.walkway} />
      <div className="container section"><article><Prose text={n.body} /></article></div>
    </>
  );
}
