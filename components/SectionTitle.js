export default function SectionTitle({ children }) {
  return (
    <h2 style={{
      fontSize: 11,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: "#555",
      fontFamily: "'DM Mono', monospace",
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: "1px solid #1a1a1a",
    }}>
      {children}
    </h2>
  );
}
