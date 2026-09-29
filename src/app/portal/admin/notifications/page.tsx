import type { Metadata } from "next";
import { requireSession } from "../../../../lib/auth";
import { ADMIN_ROLES } from "../../../../lib/permissions";
import { NotificationList } from "../../../../components/Notifications";
export const metadata: Metadata = { title: "Notifications" };
export default async function Page() { const s = await requireSession(ADMIN_ROLES); return <NotificationList userId={s.user.id} />; }
