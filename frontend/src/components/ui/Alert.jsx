const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Inline alert / banner.
 *
 * Replaces the hardcoded error/success banners in:
 *   LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage,
 *   NewCaseFilePage, EditCaseFilePage, CaseFileDetailPage,
 *   GeneratePage, SettingsPage
 *
 * Semantic colors are intentionally NOT themed — error is always red,
 * success is always green, regardless of light/dark mode.
 *
 * @param {"error"|"success"|"info"|"warning"} variant
 * @param {() => void}                          onDismiss  shows × button if provided
 */
export default function Alert({
  children,
  variant = "error",
  onDismiss,
  className = "",
  style = {},
}) {
  const palettes = {
    error: {
      background: "#FEF2F2",
      border:     "1px solid #FECACA",
      color:      "#DC2626",
      icon:       "✕",
    },
    success: {
      background: "#F0FDF4",
      border:     "1px solid #BBF7D0",
      color:      "#16A34A",
      icon:       "✓",
    },
    info: {
      background: "#EFF6FF",
      border:     "1px solid #BFDBFE",
      color:      "#2563EB",
      icon:       "ℹ",
    },
    warning: {
      background: "#FFFBEB",
      border:     "1px solid #FDE68A",
      color:      "#B45309",
      icon:       "⚠",
    },
  };

  const p = palettes[variant] ?? palettes.info;

  return (
    <div
      role="alert"
      className={className}
      style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        gap:            10,
        padding:        "11px 14px",
        background:     p.background,
        border:         p.border,
        borderRadius:   8,
        fontSize:       13,
        color:          p.color,
        fontFamily:     F,
        ...style,
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: "none",
            border:     "none",
            cursor:     "pointer",
            color:      p.color,
            fontSize:   16,
            lineHeight: 1,
            padding:    0,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
