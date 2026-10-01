import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" data-surface="public" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 520 }}>
        <p className="small" style={{ color: "var(--error-ink)", fontWeight: 700 }}>Error 404</p>
        <h1>We could not find that page</h1>
        <p className="muted">The address may be wrong, or the page may have moved. Try one of these instead.</p>
        <div className="row"><Link className="btn" href="/">Go to the home page</Link><Link href="/programmes">Browse programmes</Link><Link href="/portal/login">Portal sign-in</Link></div>
      </div>
    </main>
  );
}
