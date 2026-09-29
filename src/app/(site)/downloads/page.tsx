import type { Metadata } from "next";
import { PageHead } from "../../../components/PageHead";
import { listPublished } from "../../../services/cms";
import { Empty } from "../../../components/bits";

export const metadata: Metadata = { title: "Downloads", alternates: { canonical: "/downloads" } };

export default function Downloads() {
  const items = listPublished("download");
  return (
    <>
      <PageHead title="Downloads" crumbs={[["Downloads"]]} lead="Forms, calendars and public documents." />
      <div className="container section" style={{ maxWidth: 800 }}>
        {items.length === 0 ? <Empty title="No documents yet" /> : items.map((d) => (
          <div key={d.id} className="item"><h3 style={{ color: "var(--kcoe-ink)" }}>{d.title}</h3><p className="muted">{d.summary}</p>
            {d.file_id ? <a className="btn secondary small" href={`/files/${d.file_id}`}>Download</a> : <span className="badge neutral">File not yet uploaded</span>}</div>
        ))}
      </div>
    </>
  );
}
