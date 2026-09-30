"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "../../lib/auth";
import { currentSemester, decideCourse, saveScores, submitCourseResults } from "../../services/results";
import type { FormState } from "../../components/ActionForm";

const num = (v: FormDataEntryValue | null) => { const s = String(v ?? "").trim(); return s === "" ? null : Number(s); };

export async function scoresAction(_: FormState, data: FormData): Promise<FormState> {
  const s = await requireSession(["LECTURER", "HOD"]);
  const course = z.coerce.number().int().safeParse(data.get("course"));
  const sem = await currentSemester();
  if (!course.success || !sem) return { error: "Missing course or semester." };
  const rows: { registrationId: number; ca: number | null; exam: number | null }[] = [];
  for (const [k, v] of data.entries()) {
    const m = /^ca_(\d+)$/.exec(k);
    if (m) rows.push({ registrationId: Number(m[1]), ca: num(v), exam: num(data.get(`exam_${m[1]}`)) });
  }
  const saved = await saveScores(s.actor, rows);
  if (!saved.ok) return { error: saved.error };
  if (data.get("intent") === "submit") {
    const sub = await submitCourseResults(s.actor, course.data, sem.id);
    revalidatePath("/portal/staff", "layout");
    return sub.ok ? { ok: true, message: `Results for ${sub.value} students were submitted to your Head of Department.` } : { error: sub.error };
  }
  revalidatePath("/portal/staff", "layout");
  return { ok: true, message: `Scores saved for ${saved.value} students. They are still drafts.` };
}

export async function decideAction(data: FormData) {
  const s = await requireSession(["HOD", "DEAN"]);
  const course = z.coerce.number().int().safeParse(data.get("course"));
  const sem = z.coerce.number().int().safeParse(data.get("semester"));
  const action = data.get("decision") === "return" ? "return" : "approve";
  if (course.success && sem.success) await decideCourse(s.actor, course.data, sem.data, action);
  revalidatePath("/portal/staff", "layout");
}
