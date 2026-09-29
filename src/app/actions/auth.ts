"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { homeFor, login, logout } from "../../lib/auth";
import type { FormState } from "../../components/ActionForm";

const schema = z.object({ email: z.string().email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") });

export async function loginAction(_: FormState, data: FormData): Promise<FormState> {
  const parsed = schema.safeParse({ email: data.get("email"), password: data.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const r = await login(parsed.data.email, parsed.data.password);
  if (!r.ok) return { error: r.error };
  redirect(homeFor(r.roles));
}

export async function logoutAction() {
  await logout();
  redirect("/portal/login");
}
