import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "../../../../lib/auth";
import { studentInvoices, studentPayments } from "../../../../services/fees";
import { payInvoice } from "../../../actions/student";
import { naira, dateTime } from "../../../../lib/format";
import { Alert, Empty, StatusBadge, str } from "../../../../components/bits";

export const metadata: Metadata = { title: "Fees and receipts" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await requireSession(["STUDENT"]);
  const sp = await searchParams;
  const invoices = await studentInvoices(s.actor.studentId!);
  const payments = await studentPayments(s.actor.studentId!);
  const owed = invoices.reduce((a, i) => a + i.balance_kobo, 0);
  return (
    <>
      <h1>Fees and receipts</h1>
      {str(sp.paid) === "1" && <Alert kind="ok" title="Payment confirmed">Your payment was verified. Your receipt is below.</Alert>}
      {str(sp.paid) === "0" && <Alert kind="error" title="Payment not completed">No money was taken. You can try again.</Alert>}
      {str(sp.e) && <Alert kind="error" title="Could not start payment">{str(sp.e)}</Alert>}
      <div className="grid cols-3" style={{ marginBottom: "24px" }}>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(invoices.reduce((a, i) => a + i.amount_kobo, 0))}</div><div className="l">Total charged</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(invoices.reduce((a, i) => a + i.paid_kobo, 0))}</div><div className="l">Total paid</div></div>
        <div className="panel stat" style={{ margin: 0 }}><div className="v">{naira(owed)}</div><div className="l">Outstanding balance</div></div>
      </div>
      <div className="panel"><h2>Invoices</h2>
        {invoices.length === 0 ? <Empty title="No invoices">You have not been charged any fees.</Empty> : (
          <div className="table-wrap"><table className="table stack-sm"><thead><tr><th>Description</th><th>Semester</th><th>Due</th><th className="num">Charged</th><th className="num">Paid</th><th className="num">Balance</th><th></th></tr></thead>
            <tbody>{invoices.map((i) => (
              <tr key={i.id}><td data-label="Description">{i.description}</td><td data-label="Semester">{i.semester}</td><td data-label="Due">{i.due_date ?? "–"}</td>
                <td data-label="Charged" className="num">{naira(i.amount_kobo)}</td><td data-label="Paid" className="num">{naira(i.paid_kobo)}</td><td data-label="Balance" className="num">{naira(i.balance_kobo)}</td>
                <td data-label="">{i.balance_kobo > 0 ? <form action={payInvoice}><input type="hidden" name="invoice" value={i.id} /><button className="btn small">Pay {naira(i.balance_kobo)}</button></form> : <span className="badge ok">Paid in full</span>}</td></tr>))}</tbody></table></div>
        )}</div>
      <div className="panel"><h2>Payment history</h2>
        {payments.length === 0 ? <Empty title="No payments yet" /> : (
          <div className="table-wrap"><table className="table stack-sm"><thead><tr><th>Date</th><th>Reference</th><th>For</th><th className="num">Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.reference}><td data-label="Date">{dateTime(p.paid_at ?? p.created_at)}</td><td data-label="Reference"><code>{p.reference}</code></td><td data-label="For">{p.description}</td><td data-label="Amount" className="num">{naira(p.amount_kobo)}</td>
                <td data-label="Status"><StatusBadge status={p.status} /></td><td data-label="">{p.status === "SUCCESSFUL" && <Link href={`/portal/student/fees/receipt/${p.reference}`}>Receipt</Link>}</td></tr>))}</tbody></table></div>
        )}</div>
      <p className="small muted">Payments are confirmed by the payment provider before they count. A pending payment can take a few minutes.</p>
    </>
  );
}
