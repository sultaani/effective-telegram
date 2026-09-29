"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "../../lib/auth";
import { run } from "../../db";

export async function markAllRead() {
  const s = await requireSession();
  run("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL", Date.now(), s.user.id);
  revalidatePath("/portal", "layout");
}
