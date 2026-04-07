import { PF } from "../constants";

/**
 * Print-only label + value row.
 * Hardcodes light-mode colors. Auto-hides on null/empty.
 *
 * Props:
 *   label     — uppercase left-column label
 *   value     — data to display
 *   fullWidth — stacks label above value
 */
export default function PrintRow({ label, value, fullWidth }) {
  if (!value && value !== 0) return null;
  const display = Array.isArray(value)
    ? (value.length === 0 ? null : value.join(", "))
    : value;
  if (!display) return null;

  return (
    <div style={{ display: fullWidth ? "block" : "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: fullWidth ? 0 : 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#374151", fontFamily: PF, lineHeight: 1.6, marginTop: fullWidth ? 10 : 0, display: fullWidth ? "block" : "inline" }}>
        {typeof display === "boolean" ? (display ? "Yes" : "No") : display}
      </span>
    </div>
  );
}
