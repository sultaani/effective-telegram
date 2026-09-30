import Link from "next/link";
import { Photo } from "./Photo";

export function PageHead({ title, crumbs = [], lead, image, imageAlt = "" }: { title: string; crumbs?: [string, string?][]; lead?: string; image?: string | null; imageAlt?: string }) {
  return (
    <>
      <div className="pagehead">
        <div className="container">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link>{crumbs.map(([l, h]) => <span key={l}> / {h ? <Link href={h}>{l}</Link> : l}</span>)}</nav>
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
        </div>
      </div>
      {image && <Photo src={image} alt={imageAlt} w={1600} className="banner" />}
    </>
  );
}
