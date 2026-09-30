import type { MetadataRoute } from "next";
import { listPublished } from "../services/cms";
import { listProgrammes, listSchools } from "../services/academics";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const fixed = ["", "/schools", "/programmes", "/news", "/events", "/faq", "/downloads", "/about/leadership"].map((p) => ({ url: base + p }));
  const [pages, news, schools, programmes] = await Promise.all([listPublished("page"), listPublished("news"), listSchools(), listProgrammes()]);
  return [
    ...fixed,
    ...pages.map((p) => ({ url: `${base}/${p.slug}`, lastModified: new Date(p.updated_at) })),
    ...news.map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: new Date(n.updated_at) })),
    ...schools.map((s) => ({ url: `${base}/schools/${s.slug}` })),
    ...programmes.map((p) => ({ url: `${base}/programmes/${p.slug}` })),
  ];
}
