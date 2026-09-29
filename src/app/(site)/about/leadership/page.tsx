import type { Metadata } from "next";
import { PageHead } from "../../../../components/PageHead";
import { publicStaff } from "../../../../services/academics";
import { Alert } from "../../../../components/bits";

export const metadata: Metadata = { title: "Leadership and staff", alternates: { canonical: "/about/leadership" } };

export default function Leadership() {
  const staff = publicStaff();
  return (
    <>
      <PageHead title="Leadership and staff" crumbs={[["About", "/about"], ["Leadership"]]} />
      <div className="container section">
        <Alert kind="warn" title="Demo profiles">Names and positions below are placeholders. The college's real leadership list must be entered by the website administrator.</Alert>
        <div className="grid cols-3">
          {staff.map((s) => <div key={s.id} className="panel" style={{ margin: 0 }}><h2 style={{ fontSize: "1.1rem" }}>{s.display_name}</h2><p className="muted small" style={{ margin: 0 }}>{s.position}{s.department ? `, ${s.department}` : ""}</p></div>)}
        </div>
      </div>
    </>
  );
}
