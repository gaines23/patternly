import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";

/**
 * Collapsible section with a colored header bar.
 *
 * Props:
 *   title       — section heading
 *   subtitle    — muted sub-heading below the title
 *   color       — accent color used for border, header tint, and open-state text
 *   collapsible — when true, clicking the header toggles the body
 *   forceOpen   — overrides collapsed state (used during print)
 *   filled      — filled green checkmark (true) vs outlined ring (false) as indicator dot
 */
export default function Section({ title, subtitle, color, children, collapsible = false, forceOpen = false, filled = true }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isOpen = !collapsible || open || forceOpen;

  return (
    <div style={{ marginBottom: isOpen ? 28 : 4 }}>
      <div
        onClick={collapsible && !forceOpen ? () => setOpen(o => !o) : undefined}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 14px",
          background: isOpen ? `${color}12` : theme.surface,
          borderRadius: isOpen ? "10px 10px 0 0" : 10,
          border: `1px solid ${isOpen ? color + "40" : theme.border}`,
          borderBottom: isOpen ? `1.5px solid ${color}50` : `1px solid ${theme.border}`,
          cursor: collapsible && !forceOpen ? "pointer" : "default",
          userSelect: collapsible && !forceOpen ? "none" : undefined,
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {filled
            ? <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>✓</span>
            : <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isOpen ? color : theme.borderInput}`, background: isOpen ? `${color}15` : "transparent", flexShrink: 0 }} />
          }
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isOpen ? color : theme.text, fontFamily: F }}>{title}</p>
            {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>{subtitle}</p>}
          </div>
        </div>
        {collapsible && !forceOpen && (
          <span style={{ fontSize: 16, color: isOpen ? color : theme.textMuted, display: "inline-block", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s, color 0.15s", flexShrink: 0 }}>▾</span>
        )}
      </div>
      <div className="fp-section-body" style={{
        display: isOpen ? undefined : "none",
        background: theme.surface,
        border: `1px solid ${color}40`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        padding: "18px 14px",
      }}>
        {children}
      </div>
    </div>
  );
}
