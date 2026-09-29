import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "../../../lib/auth";
import { paymentByReference } from "../../../services/fees";
import { naira } from "../../../lib/format";
import { simulateGateway } from "../../actions/student";
import { Crest } from "../../../components/bits";

export const metadata: Metadata = { title: "Demo payment gateway", robots: { index: false } };

/** Stands in for a hosted gateway checkout page. A real gateway replaces this page and calls the webhook itself. */
export default async function DemoPay({ params }: { params: Promise<{ reference: string }> }) {
  const s = await requireSession(["STUDENT"]);
  const p = paymentByReference((await params).reference);
  if (!p || p.student_id !== s.actor.studentId) notFound();
  const done = p.status !== "PENDING";
  return (
    <div data-surface="portal" className="login">
      <main id="main" className="card">
        <div className="row" style={{ marginBottom: "var(--space-4)" }}><Crest size={36} /><strong>DemoPay checkout</strong><span className="badge warn">Simulator</span></div>
        <p className="small muted">This screen imitates an external payment provider so the payment flow can be demonstrated. No real money moves.</p>
        <h1 style={{ fontSize: "1.4rem" }}>{p.description}</h1>
        <p style={{ fontSize: "1.8rem", fontFamily: "var(--font-heading)", margin: "0 0 var(--space-4)" }}>{naira(p.amount_kobo)}</p>
        <p className="small muted">Reference {p.reference}</p>
        {done ? <a className="btn" href="/portal/student/fees">Back to fees ({p.status.toLowerCase()})</a> : (
          <div className="stack">
            <form action={simulateGateway}><input type="hidden" name="reference" value={p.reference} /><input type="hidden" name="outcome" value="success" /><button className="btn" style={{ width: "100%" }}>Pay {naira(p.amount_kobo)}</button></form>
            <form action={simulateGateway}><input type="hidden" name="reference" value={p.reference} /><input type="hidden" name="outcome" value="failed" /><button className="btn secondary" style={{ width: "100%" }}>Simulate a failed payment</button></form>
            <a className="small" href="/portal/student/fees">Cancel and return</a>
          </div>
        )}
      </main>
    </div>
  );
}
