import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { registrationView } from "../../../../services/registration";
import { RegistrationForm } from "./RegistrationForm";
import { Alert, Empty, StatusBadge } from "../../../../components/bits";
import { dateOnly } from "../../../../lib/format";
import { one } from "../../../../db";

export const metadata: Metadata = { title: "Course registration" };

export default async function Page() {
  const s = await requireSession(["STUDENT"]);
  const v = await registrationView(s.actor.studentId!);
  if (!v) return <><h1>Course registration</h1><Empty title="No active semester">Registration opens when the Registrar sets the current semester.</Empty></>;
  const saved = !!await one("SELECT 1 FROM registrations WHERE student_id=? AND semester_id=?", s.actor.studentId, v.semester.id);
  const locked = !v.open || v.status === "SUBMITTED" || v.status === "APPROVED";
  return (
    <>
      <h1>Course registration</h1>
      <p className="muted">{v.semester.label} · {v.level} level · <StatusBadge status={v.status} /></p>
      {!v.open && <Alert kind="warn" title="Registration is closed">Registration closed on {dateOnly(v.semester.reg_closes)}.</Alert>}
      {v.status === "SUBMITTED" && <Alert kind="info" title="Waiting for approval">Your registration was submitted and is with the Registrar&apos;s office.</Alert>}
      {v.status === "APPROVED" && <Alert kind="ok" title="Registration approved">Your courses are confirmed for this semester.</Alert>}
      {v.status === "REJECTED" && <Alert kind="error" title="Registration returned">Review your courses and submit again.</Alert>}
      <div className="panel">
        {v.courses.length === 0 ? <Empty title="No courses are set up for your level yet">Contact your department.</Empty> :
          <RegistrationForm courses={v.courses} min={v.min} max={v.max} locked={locked} hasSaved={saved} />}
      </div>
    </>
  );
}
