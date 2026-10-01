import Link from "next/link";
import React from "react";

export function Alert({ kind = "info", title, children }: { kind?: "ok" | "error" | "warn" | "info"; title?: string; children: React.ReactNode }) {
  return <div className={`alert ${kind}`} role={kind === "error" ? "alert" : "status"}><div>{title && <strong>{title}</strong>}{children}</div></div>;
}

const STATUS: Record<string, [string, string]> = {
  DRAFT: ["neutral", "Draft"], REVIEW: ["info", "In review"], PUBLISHED: ["ok", "Published"], ARCHIVED: ["neutral", "Archived"],
  VERIFIED: ["ok", "Verified"], AWAITING_CONFIRMATION: ["warn", "Awaiting confirmation"], SAMPLE: ["info", "Demo content"],
  SUBMITTED: ["info", "Submitted"], APPROVED: ["ok", "Approved"], REJECTED: ["bad", "Returned"], NOT_STARTED: ["neutral", "Not started"],
  HOD_APPROVED: ["info", "Approved by HOD"], PENDING: ["warn", "Pending"], SUCCESSFUL: ["ok", "Paid"], FAILED: ["bad", "Failed"], REVERSED: ["bad", "Reversed"],
  OPEN: ["warn", "Open"],
};
export function StatusBadge({ status }: { status: string }) {
  const [k, label] = STATUS[status] ?? ["neutral", status];
  return <span className={`badge ${k}`}>{label}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return <div className="empty"><strong>{title}</strong>{children}</div>;
}

export function Pagination({ page, pages, base, params }: { page: number; pages: number; base: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${base}?${sp}`;
  };
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && <Link className="btn secondary small" href={href(page - 1)}>Previous</Link>}
      <span className="muted small">Page {page} of {pages}</span>
      {page < pages && <Link className="btn secondary small" href={href(page + 1)}>Next</Link>}
    </nav>
  );
}

/** The college crest (transparent PNG). Also used as the favicon. */
export function Logo({ size = 44, className }: { size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={size > 96 ? "/images/logo.png" : "/images/logo-96.png"} width={size} height={size} alt="Kogi State College of Education crest" className={className} decoding="async" />;
}

export const pageNum = (v: string | string[] | undefined) => Math.max(1, parseInt(Array.isArray(v) ? v[0] : v ?? "1", 10) || 1);
export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
