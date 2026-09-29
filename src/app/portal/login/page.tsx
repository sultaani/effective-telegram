import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, homeFor } from "../../../lib/auth";
import { LoginForm } from "./LoginForm";
import { Crest } from "../../../components/bits";

export const metadata: Metadata = { title: "Portal sign-in", robots: { index: false } };

export default async function LoginPage() {
  const s = await getSession();
  if (s) redirect(homeFor(s.actor.roles));
  const demo = process.env.NODE_ENV !== "production" || process.env.SHOW_DEMO_ACCOUNTS === "1";
  return (
    <div data-surface="portal" className="login">
      <main id="main" className="card">
        <div className="row" style={{ marginBottom: "var(--space-6)" }}><Crest /><div><strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem" }}>KCOE Portal</strong><div className="small muted">Students, lecturers and administrators</div></div></div>
        <h1 style={{ fontSize: "1.5rem" }}>Sign in</h1>
        <LoginForm />
        <p className="small muted" style={{ marginTop: "var(--space-4)" }}>Forgot your password? Contact the ICT Directorate to have it reset. <Link href="/">Back to the college website</Link></p>
        {demo && (
          <details className="small" style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--kcoe-border)", paddingTop: "var(--space-3)" }}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Demo accounts</summary>
            <p>Password for all: <code>Demo@12345</code></p>
            <ul style={{ paddingLeft: "1.1rem" }}>
              {["student", "lecturer", "hod", "dean", "registrar", "bursary", "exams", "webadmin", "editor", "ict", "super"].map((n) => <li key={n}><code>{n}@demo.kcoe.test</code></li>)}
            </ul>
          </details>
        )}
      </main>
    </div>
  );
}
