import type { Metadata } from "next";
import { PageHead } from "../../../components/PageHead";
import { listPublished } from "../../../services/cms";
import { Empty } from "../../../components/bits";

export const metadata: Metadata = { title: "Events", alternates: { canonical: "/events" } };

export default async function Events() {
  const events = await listPublished("event");
  return (
    <>
      <PageHead title="Events" crumbs={[["Events"]]} />
      <div className="container section narrow" style={{ margin: "0 auto" }}>
        {events.length === 0 ? <Empty title="No upcoming events">New events will appear here.</Empty> : events.map((e) => {
          const dt = e.event_date ? new Date(e.event_date + "T00:00:00") : null;
          return (
            <div key={e.id} className="row" style={{ alignItems: "flex-start", padding: "var(--space-4) 0", borderTop: "1px solid var(--kcoe-border)" }}>
              <div className="datebox">{dt ? dt.getDate() : "–"}<span>{dt ? dt.toLocaleString("en-GB", { month: "short" }) : ""}</span></div>
              <div><h2 style={{ fontSize: "1.2rem", margin: 0 }}>{e.title}</h2><p className="muted small" style={{ margin: "4px 0" }}>{dt?.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {e.event_location}</p><p style={{ margin: 0 }}>{e.summary}</p></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
