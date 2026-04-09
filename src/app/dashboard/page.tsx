export default function DashboardPage() {
  return (
    <div className="container">
      <div className="glass-panel" style={{ padding: "var(--space-2xl)", marginTop: "var(--space-xl)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", marginBottom: "var(--space-md)" }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-heading)" }}>
          Welcome to QCStats. Upload your first match screenshot to start tracking.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-lg)",
          marginTop: "var(--space-xl)"
        }}>
          <div className="glass-panel" style={{ padding: "var(--space-lg)", textAlign: "center" }}>
            <div className="stat-value">0</div>
            <div className="stat-label">Matches Played</div>
          </div>
          <div className="glass-panel" style={{ padding: "var(--space-lg)", textAlign: "center" }}>
            <div className="stat-value">—</div>
            <div className="stat-label">Win Rate</div>
          </div>
          <div className="glass-panel" style={{ padding: "var(--space-lg)", textAlign: "center" }}>
            <div className="stat-value">—</div>
            <div className="stat-label">Avg LG Accuracy</div>
          </div>
          <div className="glass-panel" style={{ padding: "var(--space-lg)", textAlign: "center" }}>
            <div className="stat-value">—</div>
            <div className="stat-label">Avg Rail Accuracy</div>
          </div>
        </div>

        {/* Upload CTA */}
        <div style={{
          marginTop: "var(--space-2xl)",
          padding: "var(--space-2xl)",
          border: "2px dashed var(--border-medium)",
          borderRadius: "var(--radius-lg)",
          textAlign: "center",
          cursor: "pointer",
          transition: "border-color 0.25s ease"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>📸</div>
          <p style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.1rem",
            color: "var(--text-primary)",
            fontWeight: 600
          }}>
            Paste Screenshot (Ctrl+V)
          </p>
          <p style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            marginTop: "var(--space-xs)"
          }}>
            or drag & drop your post-match screenshot here
          </p>
        </div>
      </div>
    </div>
  );
}
