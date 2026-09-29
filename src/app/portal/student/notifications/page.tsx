import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { NotificationList } from "../../../../components/Notifications";
export const metadata: Metadata = { title: "Notifications" };
export default async function Page() { const s = await requireSession(["STUDENT"]); return <NotificationList userId={s.user.id} />; }
