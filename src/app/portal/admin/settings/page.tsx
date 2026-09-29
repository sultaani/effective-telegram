import type { Metadata } from "next";
import { requirePermission } from "../../../../lib/auth";
import { allSemesters, currentSemester } from "../../../../services/academics";
import { SemesterForm } from "../../../../components/AdminForms";
import { MIN_UNITS, MAX_UNITS } from "../../../../services/registration";
import { GRADING_SCALE } from "../../../../lib/grading";

export const metadata: Metadata = { title: "Academic settings" };

export default async function Page() {
  await requirePermission("config:manage");
  const cur = currentSemester();
  return (
    <>
      <h1>Academic settings</h1>
      <div className="panel"><h2>Current semester and registration window</h2><SemesterForm semesters={allSemesters().map((s) => ({ id: s.id, label: s.label }))} current={cur?.id} /></div>
      <div className="panel"><h2>Rules in force</h2>
        <p>Unit load per semester: {MIN_UNITS} to {MAX_UNITS}. Grading (5.0 scale): {GRADING_SCALE.map((g) => `${g.grade} from ${g.min}`).join(", ")}.</p>
        <p className="small muted" style={{ marginBottom: 0 }}>These rules are assumptions for the demonstration. Confirm them with the college and update <code>src/services/registration.ts</code> and <code>src/lib/grading.ts</code>.</p></div>
    </>
  );
}
