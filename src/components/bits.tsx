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

/** Placeholder crest. Replace with the college's official crest when supplied. */
export function Crest({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="KCOE placeholder crest">
      <path d="M24 3 43 9v14c0 11-8 19-19 22C13 42 5 34 5 23V9z" fill="#fff" stroke="#17704a" strokeWidth="3" />
      <path d="M24 3 43 9v6H5V9z" fill="#17704a" />
      <rect x="5" y="15" width="38" height="4" fill="#1b5aa6" />
      <text x="24" y="35" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="700" fontSize="14" fill="#1a2433">K</text>
      <rect x="18" y="39" width="12" height="3" fill="#b3261e" />
    </svg>
  );
}

export const pageNum = (v: string | string[] | undefined) => Math.max(1, parseInt(Array.isArray(v) ? v[0] : v ?? "1", 10) || 1);
export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
