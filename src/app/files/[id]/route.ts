import { NextResponse } from "next/server";
import { readFile } from "../../../lib/files";
import { getSession } from "../../../lib/auth";

/** Public files are served to anyone; private files only to their owner. IDs are 128-bit random, never sequential. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const f = readFile((await params).id);
  if (!f) return new NextResponse("Not found", { status: 404 });
  if (f.visibility !== "public") {
    const s = await getSession();
    if (!s || s.user.id !== f.owner_user_id) return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime, "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="${f.original_name.replace(/"/g, "")}"`,
      "Cache-Control": f.visibility === "public" ? "public, max-age=3600" : "private, no-store",
    },
  });
}
