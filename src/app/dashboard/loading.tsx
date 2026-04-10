export default function DashboardLoading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(255, 107, 0, 0.2)",
          borderTop: "3px solid var(--accent-orange)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.9rem",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "2px",
        }}
      >
        Loading Arena...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
