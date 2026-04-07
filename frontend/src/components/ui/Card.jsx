import { useTheme } from "@hooks/useTheme";

/**
 * Core surface card.
 *
 * Replaces the local `Card` definitions in:
 *   DashboardPage, SettingsPage, and the auth page card shell.
 *
 * @param {"default"|"elevated"|"flat"} variant
 *   default  — 1px border + soft shadow  (DashboardPage / SettingsPage style)
 *   elevated — stronger shadow, no border (modal / auth card style)
 *   flat     — border only, no shadow
 * @param {string|number} padding  inner padding (default "20px")
 * @param {string}        radius   border-radius override (default "12px")
 */
export default function Card({
  children,
  variant = "default",
  padding = "20px",
  radius = "12px",
  className = "",
  style = {},
}) {
  const { theme } = useTheme();

  const shadows = {
    default:  "0 1px 4px rgba(0,0,0,0.06)",
    elevated: "0 2px 12px rgba(0,0,0,0.08)",
    flat:     "none",
  };

  const borders = {
    default:  `1px solid ${theme.border}`,
    elevated: `1px solid ${theme.border}`,
    flat:     `1px solid ${theme.border}`,
  };

  return (
    <div
      className={className}
      style={{
        background: theme.surface,
        border: borders[variant],
        borderRadius: radius,
        boxShadow: shadows[variant],
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
