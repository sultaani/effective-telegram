export const naira = (kobo: number | bigint) =>
  "₦" + (Number(kobo) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dateOnly = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–";
export const dateTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
export const levelLabel = (n: number) => `${n} level`;
export const ordinal = (n: number) => (n === 1 ? "First" : n === 2 ? "Second" : `Semester ${n}`);
