import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Label + value row with automatic null/empty hiding.
 *
 * Replaces the `Row` component duplicated in:
 *   CaseFileDetailPage, SharedBriefPage, and the inline PrintView.
 *
 * @param {string}          label       left-column label text
 * @param {*}               value       hides the row when null/undefined/""
 * @param {React.ReactNode} children    alternative to value (always shown)
 * @param {string}          labelWidth  left column width (default "160px")
 */
export default function DataRow({
  label,
  value,
  children,
  labelWidth = "160px",
  className = "",
  style = {},
}) {
  const { theme } = useTheme();

  // Auto-hide when no content
  const hasContent = children !== undefined || (value !== null && value !== undefined && value !== "");
  if (!hasContent) return null;

  return (
    <div
      className={className}
      style={{
        display:     "grid",
        gridTemplateColumns: `${labelWidth} 1fr`,
        gap:         "6px 16px",
        padding:     "8px 14px",
        borderBottom: `1px solid ${theme.borderSubtle}`,
        ...style,
      }}
    >
      <span
        style={{
          fontSize:   12,
          fontWeight: 600,
          color:      theme.textMuted,
          fontFamily: F,
          paddingTop: 1,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize:   13,
          color:      theme.text,
          fontFamily: F,
          wordBreak:  "break-word",
        }}
      >
        {children ?? value}
      </span>
    </div>
  );
}
