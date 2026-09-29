"use client";
import { useActionState, useMemo, useState } from "react";
import { Submit } from "../../../../components/ActionForm";
import { registrationAction } from "../../../actions/student";

type C = { id: number; code: string; title: string; units: number; is_compulsory: number; selected: number };

export function RegistrationForm({ courses, min, max, locked, hasSaved }: { courses: C[]; min: number; max: number; locked: boolean; hasSaved: boolean }) {
  const [state, action] = useActionState(registrationAction, null);
  const [picked, setPicked] = useState<Set<number>>(() => new Set(courses.filter((c) => c.is_compulsory || (hasSaved && c.selected)).map((c) => c.id)));
  const units = useMemo(() => courses.filter((c) => picked.has(c.id)).reduce((s, c) => s + c.units, 0), [picked, courses]);
  const ok = units >= min && units <= max;
  return (
    <form action={action}>
      {state?.error && <div className="alert error" role="alert"><div><strong>That did not work</strong>{state.error}</div></div>}
      {state?.ok && <div className="alert ok" role="status"><div><strong>Done</strong>{state.message}</div></div>}
      <div className="table-wrap"><table className="table stack-sm">
        <thead><tr><th><span className="sr-only">Selected</span></th><th>Code</th><th>Course</th><th>Type</th><th className="num">Units</th></tr></thead>
        <tbody>{courses.map((c) => (
          <tr key={c.id}>
            <td data-label="Register">
              {c.is_compulsory ? <><input type="checkbox" checked disabled aria-label={`${c.code} is compulsory`} readOnly /><input type="hidden" name="course" value={c.id} /></> :
                <input type="checkbox" name="course" value={c.id} disabled={locked} checked={picked.has(c.id)} aria-label={`Register ${c.code}`}
                  onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} />}
            </td>
            <td data-label="Code">{c.code}</td><td data-label="Course">{c.title}</td>
            <td data-label="Type">{c.is_compulsory ? <span className="badge info">Compulsory</span> : <span className="badge neutral">Elective</span>}</td>
            <td data-label="Units" className="num">{c.units}</td>
          </tr>))}</tbody>
      </table></div>
      <p aria-live="polite" style={{ marginTop: "var(--space-4)" }}><strong>{units} units selected.</strong> <span className={ok ? "" : "error-text"}>{ok ? "Within the allowed range." : `You must register between ${min} and ${max} units to submit.`}</span></p>
      {!locked && <div className="row"><Submit name="intent" value="draft" label="Save draft" className="btn secondary" /><Submit name="intent" value="submit" label="Submit registration" pendingLabel="Submitting…" disabled={!ok} /></div>}
    </form>
  );
}
