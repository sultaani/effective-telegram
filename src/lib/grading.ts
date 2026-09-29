/**
 * Grading scale assumed from the NCCE convention (A=5 ... F=0). ASSUMPTION for the demo:
 * confirm the scale and pass mark with the college's Examinations Officer before production use.
 */
export const GRADING_SCALE = [
  { min: 70, grade: "A", points: 5 }, { min: 60, grade: "B", points: 4 }, { min: 50, grade: "C", points: 3 },
  { min: 45, grade: "D", points: 2 }, { min: 40, grade: "E", points: 1 }, { min: 0, grade: "F", points: 0 },
] as const;
export const MAX_CA = 30;
export const MAX_EXAM = 70;

export function gradeFor(total: number) {
  return GRADING_SCALE.find((g) => total >= g.min) ?? GRADING_SCALE[GRADING_SCALE.length - 1];
}

export function validateScores(ca: number, exam: number): string | null {
  if (!Number.isFinite(ca) || !Number.isFinite(exam)) return "Enter numbers for both scores.";
  if (ca < 0 || ca > MAX_CA) return `Continuous assessment must be between 0 and ${MAX_CA}.`;
  if (exam < 0 || exam > MAX_EXAM) return `Exam score must be between 0 and ${MAX_EXAM}.`;
  return null;
}

export interface GpaRow { units: number; points: number }
export function gpa(rows: GpaRow[]): number {
  const units = rows.reduce((s, r) => s + r.units, 0);
  if (!units) return 0;
  return Math.round((rows.reduce((s, r) => s + r.units * r.points, 0) / units) * 100) / 100;
}
