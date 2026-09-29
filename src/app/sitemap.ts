import type { MetadataRoute } from "next";
import { listPublished } from "../services/cms";
import { listProgrammes, listSchools } from "../services/academics";

export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "http://localhost:3000";
  const fixed = ["", "/schools", "/programmes", "/news", "/events", "/faq", "/downloads", "/about/leadership"].map((p) => ({ url: base + p }));
  return [
    ...fixed,
    ...listPublished("page").map((p) => ({ url: `${base}/${p.slug}`, lastModified: new Date(p.updated_at) })),
    ...listPublished("news").map((n) => ({ url: `${base}/news/${n.slug}`, lastModified: new Date(n.updated_at) })),
    ...listSchools().map((s) => ({ url: `${base}/schools/${s.slug}` })),
    ...listProgrammes().map((p) => ({ url: `${base}/programmes/${p.slug}` })),
  ];
}
