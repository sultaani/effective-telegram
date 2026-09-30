import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";
import { can } from "../../../../../lib/permissions";
import { audit } from "../../../../../lib/audit";
import { toCsv } from "../../../../../lib/csv";
import { listStudents } from "../../../../../services/users";
import { adminPayments } from "../../../../../services/fees";

/** CSV exports. Permission is checked server-side per export kind, and every export is audited. */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const s = await getSession();
  const { kind } = await params;
  const sp = new URL(req.url).searchParams;
  if (!s) return new NextResponse("Not found", { status: 404 });
  let rows: (string | number | null)[][];
  if (kind === "students" && can(s.actor, "students:read")) {
    const r = await listStudents({ q: sp.get("q") || undefined, programme: Number(sp.get("programme")) || undefined, level: Number(sp.get("level")) || undefined, page: 1 }, 100000);
    rows = [["Matric no", "Name", "Email", "Programme", "Level"], ...r.rows.map((x) => [x.matric_no, x.name, x.email, x.programme, x.level])];
  } else if (kind === "payments" && can(s.actor, "payments:read")) {
    const r = await adminPayments({ q: sp.get("q") || undefined, status: sp.get("status") || undefined, page: 1 }, 100000);
    rows = [["Reference", "Student", "Matric no", "For", "Amount (NGN)", "Status", "Paid at"], ...r.rows.map((x) => [x.reference, x.name, x.matric_no, x.description, x.amount_kobo / 100, x.status, x.paid_at ? new Date(x.paid_at).toISOString() : null])];
  } else return new NextResponse("Not found", { status: 404 });
  await audit(s.user.id, "export", kind, undefined, `${rows.length - 1} rows`);
  return new NextResponse(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}.csv"`, "Cache-Control": "no-store" } });
}
