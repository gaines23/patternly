import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Consistent page-level header: title + subtitle + optional right-side action slot.
 *
 * UX note: Every protected page currently rolls its own h1 + description + button
 * layout with slightly different spacing. This component standardizes that so all
 * pages share the same visual rhythm, making the product feel more polished.
 *
 * @param {string}          title
 * @param {string}          subtitle  muted supporting text
 * @param {React.ReactNode} action    button(s) to show on the right
 */
export default function PageHeader({
  title,
  subtitle,
  action,
  className = "",
  style = {},
}) {
  const { theme } = useTheme();

  return (
    <div
      className={className}
      style={{
        display:        "flex",
        alignItems:     "flex-start",
        justifyContent: "space-between",
        gap:            16,
        marginBottom:   24,
        flexWrap:       "wrap",
        ...style,
      }}
    >
      <div>
        <h1
          style={{
            margin:     0,
            fontSize:   24,
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 700,
            color:      theme.text,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin:     "4px 0 0",
              fontSize:   14,
              color:      theme.textMuted,
              fontFamily: F,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {action}
        </div>
      )}
    </div>
  );
}
