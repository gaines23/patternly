import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Pill badge / tag.
 *
 * Replaces the inline status badge and tool tag patterns in:
 *   CaseFileListPage, CaseFileDetailPage, DashboardPage (recent list)
 *
 * @param {"status-open"|"status-closed"|"tool"|"roadblock"|"warning"|"custom"} variant
 *
 * For "custom" pass `bg`, `color`, and `border` props directly.
 */
export default function Badge({
  children,
  variant = "tool",
  bg,
  color,
  border,
  size = "sm",
  className = "",
  style = {},
}) {
  const { theme } = useTheme();

  const fontSize = size === "xs" ? 10 : size === "sm" ? 11 : 13;

  const presets = {
    "status-open": {
      background: theme.blueLight,
      color:      theme.blue,
      border:     `1px solid ${theme.blueBorder}`,
    },
    "status-closed": {
      background: "#ECFDF5",
      color:      "#059669",
      border:     "1px solid #A7F3D0",
    },
    tool: {
      background: theme.blueLight,
      color:      theme.blue,
      border:     `1px solid ${theme.blueBorder}`,
    },
    roadblock: {
      background: "#FFF7ED",
      color:      "#EA580C",
      border:     "1px solid #FED7AA",
    },
    warning: {
      background: "#FFFBEB",
      color:      "#B45309",
      border:     "1px solid #FDE68A",
    },
    success: {
      background: "#F0FDF4",
      color:      "#16A34A",
      border:     "1px solid #BBF7D0",
    },
    custom: {
      background: bg   ?? theme.blueLight,
      color:      color ?? theme.blue,
      border:     border ?? `1px solid ${theme.blueBorder}`,
    },
  };

  const preset = presets[variant] ?? presets.custom;

  return (
    <span
      className={className}
      style={{
        display:      "inline-flex",
        alignItems:   "center",
        padding:      "2px 8px",
        borderRadius: 999,
        fontSize,
        fontWeight:   600,
        fontFamily:   F,
        letterSpacing: "0.02em",
        whiteSpace:   "nowrap",
        ...preset,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
