"use client";

/** Submit button that asks for confirmation first. Use for any destructive or irreversible action. */
export function ConfirmButton({ message, children, className = "btn small", ...rest }: { message: string; children: React.ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="submit" className={className} {...rest} onClick={(e) => { if (!window.confirm(message)) e.preventDefault(); }}>{children}</button>;
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return <button type="button" className="btn secondary small noprint" onClick={() => window.print()}>{label}</button>;
}
