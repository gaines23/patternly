import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";

/**
 * Collapsible card for workflows and lists inside the Build section.
 *
 * Props:
 *   title       — card heading
 *   color       — accent color for the collapse chevron (default sky blue)
 *   borderColor — card border color
 *   background  — card background tint
 *   badge       — optional element rendered before the title (e.g. numbered circle)
 *   action      — optional element rendered in the header right side (e.g. Map button)
 *   forceOpen   — always show body, no toggle (used during print)
 */
export default function CollapsibleCard({
  title,
  color = "#0284C7",
  borderColor = "#BAE6FD",
  background = "#0284C710",
  badge,
  children,
  forceOpen = false,
  action,
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;

  return (
    <div className="fp-collapsible-card" style={{ border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 14, background, overflow: "hidden" }}>
      <div
        onClick={forceOpen ? undefined : () => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          cursor: forceOpen ? "default" : "pointer",
          userSelect: "none",
        }}
      >
        {badge}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: F }}>{title}</span>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        {!forceOpen && <span style={{ fontSize: 11, color, opacity: 0.6 }}>{isOpen ? "▲" : "▼"}</span>}
      </div>
      <div className="fp-collapsible-body" style={{ display: isOpen ? undefined : "none", padding: "0 16px 14px" }}>
        {children}
      </div>
    </div>
  );
}
