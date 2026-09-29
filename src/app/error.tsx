"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 520 }}>
        <h1>Something went wrong</h1>
        <p className="muted">The page could not be shown. Your information is safe. Try again, and if it keeps happening, tell the ICT Directorate the time it occurred.</p>
        <button className="btn" onClick={reset} style={{ ["--accent" as string]: "var(--portal-primary)" }}>Try again</button>
      </div>
    </main>
  );
}
