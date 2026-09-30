import crypto from "node:crypto";
import { insert, one, run } from "../db";

/** Files are stored in Postgres (BYTEA) so the app server stays stateless. Extension AND magic-byte checks, 5 MB cap. */
const ALLOWED: Record<string, { mime: string; magic: number[] }> = {
  pdf: { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  png: { mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  jpg: { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  jpeg: { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
};
export const MAX_UPLOAD = 5 * 1024 * 1024;

export function validateUpload(name: string, bytes: Buffer): { ok: true; ext: string; mime: string } | { ok: false; error: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const rule = ALLOWED[ext];
  if (!rule) return { ok: false, error: "Only PDF, PNG and JPG files are allowed." };
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (bytes.length > MAX_UPLOAD) return { ok: false, error: "The file is larger than 5 MB." };
  if (!rule.magic.every((b, i) => bytes[i] === b)) return { ok: false, error: "The file content does not match its type." };
  return { ok: true, ext, mime: rule.mime };
}

export async function saveFile(name: string, bytes: Buffer, visibility: "public" | "private", ownerId: number): Promise<{ id: string } | { error: string }> {
  const v = validateUpload(name, bytes);
  if (!v.ok) return { error: v.error };
  const id = crypto.randomBytes(16).toString("hex");
  await run("INSERT INTO files(id,original_name,stored_name,mime,size,visibility,owner_user_id,created_at,data) VALUES(?,?,?,?,?,?,?,?,?)",
    id, name.replace(/[^\w.\- ]/g, "_").slice(0, 120), `${id}.${v.ext}`, v.mime, bytes.length, visibility, ownerId, Date.now(), bytes);
  return { id };
}

export async function readFile(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const f = await one<{ original_name: string; mime: string; visibility: string; owner_user_id: number | null; data: Buffer }>(
    "SELECT original_name,mime,visibility,owner_user_id,data FROM files WHERE id=?", id);
  return f && f.data ? f : null;
}
export { insert };
