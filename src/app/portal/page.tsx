import { redirect } from "next/navigation";
import { getSession, homeFor } from "../../lib/auth";

export default async function PortalHome() {
  const s = await getSession();
  redirect(s ? homeFor(s.actor.roles) : "/portal/login");
}
