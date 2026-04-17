import { useState } from "react";
import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Collapsible section with a colored header bar.
 *
 * Replaces the `Section` component duplicated (with slight differences) in:
 *   CaseFileDetailPage and SharedBriefPage.
 *
 * The theme-aware version (defaulting to `useTheme`) works for the detail
 * page; the shared brief uses it too since it's a public page that still
 * reads the light theme defaults.
 *
 * @param {string}  title        section heading
 * @param {string}  color        header accent color (left border or bg tint)
 * @param {string}  headerBg     explicit header background override
 * @param {boolean} defaultOpen  collapsed by default when false
 * @param {boolean} collapsible  set false to always show content
 * @param {React.ReactNode} indicator  optional dot/badge in the header
 * @param {React.ReactNode} action     optional element in header right side
 */
export default function Section({
  title,
  color = "#9B93E8",
  headerBg,
  defaultOpen = true,
  collapsible = true,
  indicator,
  action,
  children,
  className = "",
  style = {},
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  const bg = headerBg ?? `${color}14`; // 8% opacity tint of accent color

  return (
    <div
      className={className}
      style={{
        border:       `1px solid ${theme.border}`,
        borderRadius: 10,
        overflow:     "hidden",
        ...style,
      }}
    >
      {/* Header bar */}
      <div
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? open : undefined}
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") setOpen((o) => !o); } : undefined}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          padding:      "10px 14px",
          background:   bg,
          borderBottom: open ? `1px solid ${theme.border}` : "none",
          cursor:       collapsible ? "pointer" : "default",
          userSelect:   "none",
        }}
      >
        {/* Accent indicator dot */}
        <span
          style={{
            width:        8,
            height:       8,
            borderRadius: "50%",
            background:   color,
            flexShrink:   0,
          }}
        />

        <span
          style={{
            flex:       1,
            fontSize:   12,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color:      theme.textSec,
            fontFamily: F,
          }}
        >
          {title}
        </span>

        {indicator}

        {action && (
          <span onClick={(e) => e.stopPropagation()} style={{ marginLeft: "auto" }}>
            {action}
          </span>
        )}

        {collapsible && (
          <span
            style={{
              fontSize:   11,
              color:      theme.textFaint,
              transform:  open ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 0.18s ease",
              marginLeft: action ? 0 : "auto",
            }}
          >
            ▾
          </span>
        )}
      </div>

      {/* Content */}
      {open && (
        <div style={{ background: theme.surface }}>
          {children}
        </div>
      )}
    </div>
  );
}
