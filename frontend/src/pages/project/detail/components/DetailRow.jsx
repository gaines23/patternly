import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";

/**
 * Label + value display row used throughout the detail sections.
 *
 * Auto-hides when value is null, undefined, or an empty string/array.
 * Arrays are joined with ", ". Booleans render as "Yes" / "No".
 *
 * Props:
 *   label     — uppercase left-column label
 *   value     — the data to display
 *   fullWidth — stacks label above value instead of side-by-side grid
 *
 * Note: this is intentionally separate from the shared ui/DataRow component,
 * which uses different column widths and styling conventions.
 */
export default function DetailRow({ label, value, fullWidth }) {
  const { theme } = useTheme();

  if (!value && value !== 0) return null;
  const displayValue = Array.isArray(value)
    ? value.length === 0 ? null : value.join(", ")
    : value;
  if (!displayValue) return null;

  return (
    <div style={{
      display: fullWidth ? "block" : "grid",
      gridTemplateColumns: "180px 1fr",
      gap: 12,
      padding: "10px 0",
      borderBottom: `1px solid ${theme.borderSubtle}`,
    }}>
      <span style={{
        fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F,
        textTransform: "uppercase", letterSpacing: "0.06em",
        paddingTop: fullWidth ? 0 : 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.6,
        marginTop: fullWidth ? 10 : 0,
        display: fullWidth ? "block" : "inline",
      }}>
        {typeof displayValue === "boolean"
          ? displayValue ? "Yes" : "No"
          : displayValue}
      </span>
    </div>
  );
}
