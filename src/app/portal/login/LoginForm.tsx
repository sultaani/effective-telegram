"use client";
import { ActionForm } from "../../../components/ActionForm";
import { loginAction } from "../../actions/auth";

export function LoginForm() {
  return (
    <ActionForm action={loginAction} submit="Sign in" pendingLabel="Signing in…">
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
    </ActionForm>
  );
}
