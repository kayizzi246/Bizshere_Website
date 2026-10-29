"use client";

/**
 * Last resort when the root layout itself fails (the site header couldn't render), so it brings
 * its own <html> and plain styles. Page-level failures use src/app/(site)/error.tsx instead.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F3F6FA", color: "#0B1220" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>BizSphere-Ug didn&apos;t load</h1>
            <p style={{ color: "#5B6475", lineHeight: 1.5, margin: "0 0 20px" }}>Something went wrong on our side. It usually works on a second try.</p>
            <button type="button" onClick={() => reset()} style={{ background: "#0072CE", color: "#fff", border: 0, borderRadius: 10, padding: "12px 22px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Try again</button>
            {error.digest ? <p style={{ fontSize: 12, color: "#8A8F98", marginTop: 16 }}>Reference: {error.digest}</p> : null}
          </div>
        </main>
      </body>
    </html>
  );
}
