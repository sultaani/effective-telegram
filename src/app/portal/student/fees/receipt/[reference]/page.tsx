import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../../../lib/auth";
import { receipt } from "../../../../../../services/fees";
import { PrintButton } from "../../../../../../components/Interactive";
import { naira, dateTime } from "../../../../../../lib/format";

export const metadata: Metadata = { title: "Payment receipt", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const s = await requireSession(["STUDENT"]);
  const r = await receipt(s.actor.studentId!, (await params).reference); // scoped to the signed-in student
  if (!r) notFound();
  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <div className="row between"><h1 style={{ fontSize: "1.5rem" }}>Payment receipt</h1><PrintButton label="Print receipt" /></div>
      <p className="muted">Kogi State College of Education, Ankpa</p>
      <table className="table"><tbody>
        <tr><th scope="row">Student</th><td>{r.name} ({r.matric_no})</td></tr>
        <tr><th scope="row">Programme</th><td>{r.programme}</td></tr>
        <tr><th scope="row">Payment for</th><td>{r.description}</td></tr>
        <tr><th scope="row">Amount paid</th><td><strong>{naira(r.amount_kobo)}</strong></td></tr>
        <tr><th scope="row">Date</th><td>{dateTime(r.paid_at)}</td></tr>
        <tr><th scope="row">Method</th><td>{r.method ?? "–"}</td></tr>
        <tr><th scope="row">Reference</th><td><code>{r.reference}</code></td></tr>
        <tr><th scope="row">Gateway reference</th><td><code>{r.gateway_ref}</code></td></tr>
      </tbody></table>
      <p className="small muted">Demonstration receipt. Use your browser&apos;s print command to print or save as PDF.</p>
    </div>
  );
}
