import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "../../../../../lib/auth";
import { classList } from "../../../../../services/results";
import { currentSemester } from "../../../../../services/academics";
import { one } from "../../../../../db";
import { MAX_CA, MAX_EXAM } from "../../../../../lib/grading";
import { ScoreForm } from "./ScoreForm";
import { Empty } from "../../../../../components/bits";

export const metadata: Metadata = { title: "Class list and scores" };

export default async function Page({ params }: { params: Promise<{ courseId: string }> }) {
  const s = await requireSession(["LECTURER", "HOD"]);
  const id = Number((await params).courseId);
  const sem = currentSemester();
  if (!Number.isInteger(id) || !sem) notFound();
  const rows = classList(s.actor, id, sem.id); // null unless the signed-in lecturer is allocated this course
  if (!rows) notFound();
  const c = one<{ code: string; title: string; level: number; units: number }>("SELECT code,title,level,units FROM courses WHERE id=?", id)!;
  return (
    <>
      <h1>{c.code} {c.title}</h1>
      <p className="muted">{sem.label} · {c.level} level · {c.units} units · {rows.length} approved registrations</p>
      <div className="panel">
        {rows.length === 0 ? <Empty title="No students yet">Students appear here once their course registration is approved.</Empty> : <ScoreForm courseId={id} rows={rows} maxCa={MAX_CA} maxExam={MAX_EXAM} />}
      </div>
    </>
  );
}
