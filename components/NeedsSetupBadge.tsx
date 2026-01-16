export function NeedsSetupBadge({ label }: { label: string }) {
  return (
    <span
      style={{
        background: "#fff5f5",
        color: "#c53030",
        border: "1px solid #feb2b2",
        borderRadius: "999px",
        padding: "0.2rem 0.6rem",
        fontSize: "0.75rem",
      }}
    >
      {label}: Needs Setup
    </span>
  );
}
