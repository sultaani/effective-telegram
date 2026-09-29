"use client";
import { useActionState, useState } from "react";
import { Submit } from "../../../../../components/ActionForm";
import { scoresAction } from "../../../../actions/staff";

type Row = { registration_id: number; matric_no: string; name: string; ca: number | null; exam: number | null; total: number | null; grade: string | null; status: string | null };
const GRADES = [[70, "A"], [60, "B"], [50, "C"], [45, "D"], [40, "E"], [0, "F"]] as const;
const gradeOf = (t: number) => GRADES.find(([m]) => t >= m)![1];

export function ScoreForm({ courseId, rows, maxCa, maxExam }: { courseId: number; rows: Row[]; maxCa: number; maxExam: number }) {
  const [state, action] = useActionState(scoresAction, null);
  const [vals, setVals] = useState<Record<number, { ca: string; exam: string }>>(() => Object.fromEntries(rows.map((r) => [r.registration_id, { ca: r.ca?.toString() ?? "", exam: r.exam?.toString() ?? "" }])));
  const locked = rows.length > 0 && rows.every((r) => r.status && r.status !== "DRAFT");
  const set = (id: number, k: "ca" | "exam", v: string) => setVals((p) => ({ ...p, [id]: { ...p[id], [k]: v } }));
  const bad = (v: string, max: number) => v !== "" && (Number(v) < 0 || Number(v) > max || Number.isNaN(Number(v)));
  return (
    <form action={action}>
      <input type="hidden" name="course" value={courseId} />
      {state?.error && <div className="alert error" role="alert"><div><strong>That did not work</strong>{state.error}</div></div>}
      {state?.ok && <div className="alert ok" role="status"><div><strong>Done</strong>{state.message}</div></div>}
      <div className="table-wrap"><table className="table stack-sm">
        <thead><tr><th>Matric no.</th><th>Name</th><th className="num">CA (max {maxCa})</th><th className="num">Exam (max {maxExam})</th><th className="num">Total</th><th>Grade</th><th>Status</th></tr></thead>
        <tbody>{rows.map((r) => {
          const v = vals[r.registration_id], edit = !r.status || r.status === "DRAFT";
          const total = v.ca !== "" || v.exam !== "" ? Number(v.ca || 0) + Number(v.exam || 0) : null;
          return (
            <tr key={r.registration_id}>
              <td data-label="Matric no.">{r.matric_no}</td><td data-label="Name">{r.name}</td>
              <td data-label="CA" className="num">{edit ? <><label className="sr-only" htmlFor={`ca${r.registration_id}`}>CA for {r.name}</label><input id={`ca${r.registration_id}`} className="score-input" name={`ca_${r.registration_id}`} type="number" step="0.5" min={0} max={maxCa} inputMode="decimal" value={v.ca} onChange={(e) => set(r.registration_id, "ca", e.target.value)} aria-invalid={bad(v.ca, maxCa)} /></> : r.ca}</td>
              <td data-label="Exam" className="num">{edit ? <><label className="sr-only" htmlFor={`ex${r.registration_id}`}>Exam for {r.name}</label><input id={`ex${r.registration_id}`} className="score-input" name={`exam_${r.registration_id}`} type="number" step="0.5" min={0} max={maxExam} inputMode="decimal" value={v.exam} onChange={(e) => set(r.registration_id, "exam", e.target.value)} aria-invalid={bad(v.exam, maxExam)} /></> : r.exam}</td>
              <td data-label="Total" className="num">{total ?? "–"}</td><td data-label="Grade"><span className="gradebox">{total != null && !bad(v.ca, maxCa) && !bad(v.exam, maxExam) ? gradeOf(total) : "–"}</span></td>
              <td data-label="Status">{r.status ? <span className={`badge ${r.status === "DRAFT" ? "warn" : r.status === "PUBLISHED" ? "ok" : "info"}`}>{r.status === "DRAFT" ? "Draft" : r.status === "SUBMITTED" ? "With HOD" : r.status === "HOD_APPROVED" ? "With exams office" : "Published"}</span> : <span className="badge neutral">No score</span>}</td>
            </tr>);
        })}</tbody></table></div>
      {!locked && <div className="row" style={{ marginTop: "var(--space-4)" }}>
        <Submit name="intent" value="save" label="Save scores" className="btn secondary" pendingLabel="Saving…" />
        <Submit name="intent" value="submit" label="Save and submit to HOD" pendingLabel="Submitting…" />
      </div>}
      {!locked && <p className="small muted">Submitting locks the scores. Only your Head of Department can return them for correction.</p>}
    </form>
  );
}
