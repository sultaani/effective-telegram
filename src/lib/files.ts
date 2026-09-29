import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDir, one, run } from "../db";

/** Allowed types are checked by extension AND magic bytes. 5 MB cap. Files are stored under random names outside /public. */
const ALLOWED: Record<string, { mime: string; magic: number[] }> = {
  pdf: { mime: "application/pdf", magic: [0x25, 0x50, 0x44, 0x46] },
  png: { mime: "image/png", magic: [0x89, 0x50, 0x4e, 0x47] },
  jpg: { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
  jpeg: { mime: "image/jpeg", magic: [0xff, 0xd8, 0xff] },
};
export const MAX_UPLOAD = 5 * 1024 * 1024;
const uploadDir = () => path.join(dataDir(), "uploads");

export function validateUpload(name: string, bytes: Buffer): { ok: true; ext: string; mime: string } | { ok: false; error: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const rule = ALLOWED[ext];
  if (!rule) return { ok: false, error: "Only PDF, PNG and JPG files are allowed." };
  if (bytes.length === 0) return { ok: false, error: "The file is empty." };
  if (bytes.length > MAX_UPLOAD) return { ok: false, error: "The file is larger than 5 MB." };
  if (!rule.magic.every((b, i) => bytes[i] === b)) return { ok: false, error: "The file content does not match its type." };
  return { ok: true, ext, mime: rule.mime };
}

export function saveFile(name: string, bytes: Buffer, visibility: "public" | "private", ownerId: number): { id: string } | { error: string } {
  const v = validateUpload(name, bytes);
  if (!v.ok) return { error: v.error };
  const id = crypto.randomBytes(16).toString("hex");
  fs.mkdirSync(uploadDir(), { recursive: true });
  fs.writeFileSync(path.join(uploadDir(), `${id}.${v.ext}`), bytes, { mode: 0o640 });
  run("INSERT INTO files(id,original_name,stored_name,mime,size,visibility,owner_user_id,created_at) VALUES(?,?,?,?,?,?,?,?)",
    id, name.replace(/[^\w.\- ]/g, "_").slice(0, 120), `${id}.${v.ext}`, v.mime, bytes.length, visibility, ownerId, Date.now());
  return { id };
}

export function readFile(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const f = one<{ stored_name: string; original_name: string; mime: string; visibility: string; owner_user_id: number | null }>("SELECT * FROM files WHERE id=?", id);
  if (!f) return null;
  const p = path.join(uploadDir(), f.stored_name);
  if (!fs.existsSync(p)) return null;
  return { ...f, data: fs.readFileSync(p) };
}
