import { all, insert, one, run } from "../db";
import { audit } from "../lib/audit";
import { type Actor, can } from "../lib/permissions";
import { slugify } from "../lib/format";
import { escapeLike } from "./academics";

export const CONTENT_TYPES = ["page", "news", "announcement", "event", "faq", "download", "testimonial"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export type Status = (typeof STATUSES)[number];
export const VERIFICATIONS = ["VERIFIED", "AWAITING_CONFIRMATION", "SAMPLE"] as const;
export type Verification = (typeof VERIFICATIONS)[number];

export interface Content {
  id: number; type: ContentType; slug: string; title: string; summary: string; body: string; status: Status; verification: Verification;
  audience: string; event_date: string | null; event_location: string | null; seo_description: string | null; file_id: string | null; image_url: string | null;
  created_by: number | null; updated_by: number | null; created_at: number; updated_at: number; published_at: number | null;
}

export function listPublished(type: ContentType, opts: { limit?: number; audience?: string } = {}) {
  const order = type === "event" ? "COALESCE(event_date,'') ASC" : "published_at DESC";
  return all<Content>(
    `SELECT * FROM content_items WHERE type=? AND status='PUBLISHED' AND audience IN ('public', ?) ORDER BY ${order} LIMIT ?`,
    type, opts.audience ?? "public", opts.limit ?? 100);
}
export const getPublished = (type: ContentType, slug: string) =>
  one<Content>("SELECT * FROM content_items WHERE type=? AND slug=? AND status='PUBLISHED' AND audience='public'", type, slug);
export const getById = (id: number) => one<Content>("SELECT * FROM content_items WHERE id=?", id);

export async function listAdmin(f: { type?: string; status?: string; q?: string; page?: number }, pageSize = 15) {
  const where: string[] = []; const p: unknown[] = [];
  if (f.type) { where.push("type=?"); p.push(f.type); }
  if (f.status) { where.push("status=?"); p.push(f.status); }
  if (f.q) { where.push("title ILIKE ? ESCAPE '\\'"); p.push(escapeLike(f.q)); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = (await one<{ n: number }>(`SELECT COUNT(*) n FROM content_items ${w}`, ...p))!.n;
  const rows = await all<Content>(`SELECT * FROM content_items ${w} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, ...p, pageSize, ((f.page ?? 1) - 1) * pageSize);
  return { rows, total, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export interface ContentInput {
  id?: number; type: ContentType; title: string; slug?: string; summary: string; body: string;
  audience: string; event_date?: string; event_location?: string; seo_description?: string; file_id?: string | null; image_url?: string | null;
}
export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

/** Editors may only change DRAFT/REVIEW items; publishers may change anything. */
export async function saveContent(actor: Actor, input: ContentInput): Promise<Result<number>> {
  if (!can(actor, "cms:draft")) return { ok: false, error: "You do not have permission to edit content." };
  if (!input.title.trim()) return { ok: false, error: "Enter a title." };
  const image = input.image_url?.trim() || null;
  if (image && !/^(https:\/\/|\/files\/)/.test(image)) return { ok: false, error: "Image addresses must start with https:// or be an uploaded file." };
  const slug = slugify(input.slug?.trim() || input.title);
  const now = Date.now();
  if (input.id) {
    const cur = await getById(input.id);
    if (!cur) return { ok: false, error: "That item no longer exists." };
    if ((cur.status === "PUBLISHED" || cur.status === "ARCHIVED") && !can(actor, "cms:publish"))
      return { ok: false, error: "Published content can only be edited by a website administrator." };
    if (await one("SELECT id FROM content_items WHERE type=? AND slug=? AND id<>?", cur.type, slug, cur.id)) return { ok: false, error: "Another item already uses that web address. Change the slug." };
    await run(`UPDATE content_items SET title=?, slug=?, summary=?, body=?, audience=?, event_date=?, event_location=?, seo_description=?,
         file_id=COALESCE(?, file_id), image_url=?, updated_by=?, updated_at=? WHERE id=?`,
      input.title.trim(), slug, input.summary, input.body, input.audience, input.event_date || null, input.event_location || null,
      input.seo_description || null, input.file_id ?? null, image, actor.userId, now, cur.id);
    await audit(actor.userId, "cms.update", "content", cur.id, cur.title);
    return { ok: true, value: cur.id };
  }
  if (await one("SELECT 1 AS x FROM content_items WHERE type=? AND slug=?", input.type, slug)) return { ok: false, error: "Another item already uses that web address. Change the slug." };
  const id = await insert(`INSERT INTO content_items(type,slug,title,summary,body,status,verification,audience,event_date,event_location,seo_description,file_id,image_url,created_by,updated_by,created_at,updated_at)
     VALUES(?,?,?,?,?,'DRAFT','AWAITING_CONFIRMATION',?,?,?,?,?,?,?,?,?,?)`,
    input.type, slug, input.title.trim(), input.summary, input.body, input.audience, input.event_date || null, input.event_location || null,
    input.seo_description || null, input.file_id ?? null, image, actor.userId, actor.userId, now, now);
  await audit(actor.userId, "cms.create", "content", id, input.title);
  return { ok: true, value: id };
}

const ALLOWED: Record<Status, Status[]> = {
  DRAFT: ["REVIEW", "PUBLISHED", "ARCHIVED"], REVIEW: ["DRAFT", "PUBLISHED", "ARCHIVED"], PUBLISHED: ["ARCHIVED", "DRAFT"], ARCHIVED: ["DRAFT"],
};

export async function transition(actor: Actor, id: number, to: Status): Promise<Result> {
  const cur = await getById(id);
  if (!cur) return { ok: false, error: "That item no longer exists." };
  if (!ALLOWED[cur.status].includes(to)) return { ok: false, error: `Cannot move from ${cur.status.toLowerCase()} to ${to.toLowerCase()}.` };
  const needsPublisher = to === "PUBLISHED" || to === "ARCHIVED" || cur.status === "PUBLISHED";
  if (needsPublisher ? !can(actor, "cms:publish") : !can(actor, "cms:draft")) return { ok: false, error: "You do not have permission for that step." };
  await run("UPDATE content_items SET status=?, updated_by=?, updated_at=?, published_at=CASE WHEN ?='PUBLISHED' THEN ?::bigint ELSE published_at END WHERE id=?",
    to, actor.userId, Date.now(), to, Date.now(), id);
  await audit(actor.userId, `cms.${to.toLowerCase()}`, "content", id, cur.title);
  return { ok: true, value: undefined };
}

export async function setVerification(actor: Actor, id: number, v: Verification): Promise<Result> {
  if (!can(actor, "cms:verify")) return { ok: false, error: "Only a website administrator can change verification." };
  if (!VERIFICATIONS.includes(v)) return { ok: false, error: "Unknown verification status." };
  await run("UPDATE content_items SET verification=?, updated_by=?, updated_at=? WHERE id=?", v, actor.userId, Date.now(), id);
  await audit(actor.userId, "cms.verify", "content", id, v);
  return { ok: true, value: undefined };
}

export async function publicSearch(q: string) {
  const like = escapeLike(q);
  const [content, programmes, schools] = await Promise.all([
    all<Content>(`SELECT * FROM content_items WHERE status='PUBLISHED' AND audience='public' AND type<>'testimonial' AND (title ILIKE ? ESCAPE '\\' OR summary ILIKE ? ESCAPE '\\' OR body ILIKE ? ESCAPE '\\') ORDER BY published_at DESC LIMIT 20`, like, like, like),
    all<{ slug: string; title: string; award: string; department: string }>(`SELECT p.slug,p.title,p.award,d.name department FROM programmes p JOIN departments d ON d.id=p.department_id WHERE p.is_active=1 AND (p.title ILIKE ? ESCAPE '\\' OR d.name ILIKE ? ESCAPE '\\') LIMIT 20`, like, like),
    all<{ slug: string; name: string }>("SELECT slug,name FROM schools WHERE name ILIKE ? ESCAPE '\\'", like),
  ]);
  return { content, programmes, schools };
}
