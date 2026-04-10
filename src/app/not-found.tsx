import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>💀</div>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "3rem",
          color: "var(--accent-red)",
          marginBottom: "0.5rem",
        }}
      >
        FRAGGED
      </h1>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.5rem",
          color: "var(--text-secondary)",
          marginBottom: "1rem",
        }}
      >
        404 — Page Not Found
      </h2>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.9rem",
          color: "var(--text-muted)",
          maxWidth: "400px",
          marginBottom: "2rem",
        }}
      >
        This page got telefragged. There is nothing here.
        Check the URL or go back to spawn.
      </p>
      <Link
        href="/"
        style={{
          padding: "0.7rem 2rem",
          borderRadius: "8px",
          background: "linear-gradient(135deg, var(--accent-red), var(--accent-orange))",
          color: "white",
          fontFamily: "var(--font-display)",
          fontSize: "0.9rem",
          fontWeight: 600,
          textDecoration: "none",
          textTransform: "uppercase",
          letterSpacing: "1px",
          transition: "all 0.2s",
        }}
      >
        ↩ RESPAWN
      </Link>
    </div>
  );
}
