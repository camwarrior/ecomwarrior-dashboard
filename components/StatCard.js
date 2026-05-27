export default function StatCard({ label, value, sub, color = "default", prefix = "$" }) {
  const colors = {
    green:   { val: "#4ade80", bg: "#16391f22" },
    red:     { val: "#f87171", bg: "#3b1a1a22" },
    blue:    { val: "#60a5fa", bg: "#17203822" },
    amber:   { val: "#fbbf24", bg: "#2d200922" },
    default: { val: "#e8e8e8", bg: "#1a1a1a" },
  };
  const c = colors[color] || colors.default;

  return (
    <div style={{
      background: c.bg,
      border: `1px solid #242424`,
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#666", fontFamily: "'DM Mono', monospace" }}>
        {label}
      </span>
      <span style={{ fontSize: 28, fontWeight: 700, color: c.val, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>
        {prefix}{typeof value === "number" ? value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value}
      </span>
      {sub && (
        <span style={{ fontSize: 12, color: "#555", fontFamily: "'DM Mono', monospace" }}>{sub}</span>
      )}
    </div>
  );
}
