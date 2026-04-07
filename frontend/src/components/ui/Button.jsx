import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Shared button primitive.
 *
 * Replaces ~20 inline button definitions spread across every page.
 *
 * @param {"primary"|"secondary"|"ghost"|"danger"} variant
 * @param {"sm"|"md"|"lg"}                          size
 * @param {boolean}                                  loading  shows spinner + disables
 * @param {boolean}                                  fullWidth
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = "",
  style = {},
}) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const padding = { sm: "6px 14px", md: "9px 18px", lg: "12px 24px" }[size];
  const fontSize = { sm: 12, md: 14, lg: 15 }[size];

  const base = {
    display:      "inline-flex",
    alignItems:   "center",
    justifyContent: "center",
    gap:          6,
    padding,
    fontSize,
    fontWeight:   700,
    fontFamily:   F,
    borderRadius: 10,
    border:       "none",
    cursor:       isDisabled ? "not-allowed" : "pointer",
    transition:   "background 0.15s, box-shadow 0.15s, opacity 0.15s",
    width:        fullWidth ? "100%" : undefined,
    opacity:      isDisabled ? 0.65 : 1,
  };

  const variants = {
    primary: {
      background: theme.blue,
      color: "#fff",
    },
    secondary: {
      background: theme.blueLight,
      color: theme.blue,
      border: `1px solid ${theme.blueBorder}`,
    },
    ghost: {
      background: "transparent",
      color: theme.textMuted,
      border: `1px solid ${theme.border}`,
    },
    danger: {
      background: "#FEF2F2",
      color: "#DC2626",
      border: "1px solid #FECACA",
    },
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={className}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {loading && (
        <span
          style={{
            display: "inline-block",
            width: 13,
            height: 13,
            border: "2px solid currentColor",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "fp-spin 0.6s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}
