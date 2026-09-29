"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type FormState = { ok?: boolean; message?: string; error?: string; detail?: string } | null;
export type Action = (prev: FormState, data: FormData) => Promise<FormState>;

export function Submit({ label, pendingLabel, className = "btn", ...rest }: { label: string; pendingLabel?: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return <button type="submit" className={className} disabled={pending || rest.disabled} aria-disabled={pending} {...rest}>{pending ? (pendingLabel ?? "Working…") : label}</button>;
}

/** Wraps a server action, shows success/error messages accessibly, and disables the button while it runs. */
export function ActionForm({ action, children, submit, pendingLabel, className, submitClass, confirm }: {
  action: Action; children?: React.ReactNode; submit: string; pendingLabel?: string; className?: string; submitClass?: string; confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className} onSubmit={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}>
      {state?.error && <div className="alert error" role="alert"><div><strong>That did not work</strong>{state.error}</div></div>}
      {state?.ok && state.message && <div className="alert ok" role="status"><div><strong>Done</strong>{state.message}{state.detail && <div><code>{state.detail}</code></div>}</div></div>}
      {children}
      <Submit label={submit} pendingLabel={pendingLabel} className={submitClass ?? "btn"} />
    </form>
  );
}
