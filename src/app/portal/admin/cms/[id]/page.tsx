import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../../../lib/auth";
import { can } from "../../../../../lib/permissions";
import { CONTENT_TYPES, getById, VERIFICATIONS } from "../../../../../services/cms";
import { ContentForm } from "../../../../../components/AdminForms";
import { ConfirmButton } from "../../../../../components/Interactive";
import { StatusBadge, str } from "../../../../../components/bits";
import { transitionAction, verifyAction } from "../../../../actions/admin";

export const metadata: Metadata = { title: "Edit content" };
const NEXT: Record<string, [string, string][]> = {
  DRAFT: [["REVIEW", "Send for review"], ["PUBLISHED", "Publish now"]], REVIEW: [["PUBLISHED", "Publish"], ["DRAFT", "Return to draft"]],
  PUBLISHED: [["ARCHIVED", "Archive"], ["DRAFT", "Unpublish to draft"]], ARCHIVED: [["DRAFT", "Restore as draft"]],
};

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requirePermission("cms:draft");
  const { id } = await params; const sp = await searchParams;
  if (id === "new") {
    const type = str(sp.type) ?? "news";
    if (!(CONTENT_TYPES as readonly string[]).includes(type)) notFound();
    return <><h1>New {type}</h1><p><Link href="/portal/admin/cms">Back to content</Link></p><div className="panel"><ContentForm type={type} /></div></>;
  }
  const item = await getById(Number(id));
  if (!item) notFound();
  const publisher = can(s.actor, "cms:publish");
  const steps = NEXT[item.status].filter(([to]) => (to === "PUBLISHED" || to === "ARCHIVED" || item.status === "PUBLISHED" ? publisher : true));
  const path = item.type === "news" ? `/news/${item.slug}` : item.type === "page" ? `/${item.slug}` : null;
  return (
    <>
      <h1>{item.title}</h1>
      <p><Link href="/portal/admin/cms">Back to content</Link> {item.status === "PUBLISHED" && path && <>· <Link href={path}>View on the website</Link></>}</p>
      <div className="panel"><h2>Publishing</h2>
        <p>Status: <StatusBadge status={item.status} /> · Accuracy: <StatusBadge status={item.verification} /></p>
        <div className="row">{steps.map(([to, label]) => <form key={to} action={transitionAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="to" value={to} />{to === "ARCHIVED" || to === "PUBLISHED" || item.status === "PUBLISHED" ? <ConfirmButton className={to === "ARCHIVED" ? "btn small secondary" : "btn small"} message={to === "PUBLISHED" ? "Publish this to the public website?" : "Remove this from the public website?"}>{label}</ConfirmButton> : <button className="btn small">{label}</button>}</form>)}</div>
        {can(s.actor, "cms:verify") && <form action={verifyAction} className="row" style={{ marginTop: "16px" }}><input type="hidden" name="id" value={item.id} />
          <label htmlFor="ver" className="label">Accuracy</label><select id="ver" name="v" defaultValue={item.verification} style={{ width: "auto" }}>{VERIFICATIONS.map((v) => <option key={v} value={v}>{v === "VERIFIED" ? "Verified" : v === "SAMPLE" ? "Demo content" : "Awaiting confirmation"}</option>)}</select><button className="btn small secondary">Update</button></form>}
        {!publisher && item.status !== "DRAFT" && item.status !== "REVIEW" && <p className="small muted">Only a website administrator can change published content.</p>}
      </div>
      <div className="panel"><h2>Content</h2><ContentForm item={item} type={item.type} /></div>
    </>
  );
}
