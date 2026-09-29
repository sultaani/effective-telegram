import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { all } from "../../../../db";
import { listProgrammes } from "../../../../services/academics";
import { ProgrammeForm } from "../../../../components/AdminForms";
import { programmeVerifyAction } from "../../../actions/admin";
import { StatusBadge } from "../../../../components/bits";

export const metadata: Metadata = { title: "Programmes" };

export default async function Page() {
  await requirePermission("programmes:manage");
  const rows = listProgrammes({ includeInactive: true });
  const deps = all<{ id: number; name: string; school: string }>("SELECT d.id,d.name,s.name school FROM departments d JOIN schools s ON s.id=d.school_id ORDER BY s.name,d.name");
  return (
    <>
      <h1>Programmes</h1>
      <div className="panel"><h2>Add a programme</h2><ProgrammeForm departments={deps.map((d) => ({ id: d.id, label: `${d.name} (${d.school})` }))} /></div>
      <div className="panel table-wrap"><table className="table stack-sm"><thead><tr><th>Programme</th><th>Department</th><th>Award</th><th>Accuracy</th><th>Listed</th><th>Manage</th></tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id}><td data-label="Programme">{p.title}</td><td data-label="Department">{p.department}</td><td data-label="Award">{p.award}</td><td data-label="Accuracy"><StatusBadge status={p.verification} /></td><td data-label="Listed">{p.is_active ? "Yes" : "Hidden"}</td>
            <td data-label="Manage"><form action={programmeVerifyAction} className="row" style={{ justifyContent: "flex-end" }}><input type="hidden" name="id" value={p.id} />
              <select name="v" defaultValue={p.verification} aria-label={`Accuracy for ${p.title}`} style={{ width: "auto", minHeight: 36 }}><option value="VERIFIED">Verified</option><option value="AWAITING_CONFIRMATION">Awaiting confirmation</option><option value="SAMPLE">Demo content</option></select>
              <button className="btn small secondary">Set</button><button name="toggle" value="1" className="btn small secondary">{p.is_active ? "Hide" : "Show"}</button></form></td></tr>))}</tbody></table></div>
    </>
  );
}
