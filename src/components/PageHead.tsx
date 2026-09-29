import Link from "next/link";

export function PageHead({ title, crumbs = [], lead }: { title: string; crumbs?: [string, string?][]; lead?: string }) {
  return (
    <div className="pagehead">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link>{crumbs.map(([l, h]) => <span key={l}> / {h ? <Link href={h}>{l}</Link> : l}</span>)}</nav>
        <h1>{title}</h1>
        {lead && <p className="muted" style={{ maxWidth: "62ch", margin: "var(--space-3) 0 0" }}>{lead}</p>}
      </div>
    </div>
  );
}
