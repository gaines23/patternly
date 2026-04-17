import { useState, useRef, useEffect } from "react";
import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";

const STATUS_COLORS = {
  open:        { color: "#7B72B8", bg: "#EEEAF8" },
  in_progress: { color: "#B45309", bg: "#FFFBEB" },
  done:        { color: "#065F46", bg: "#ECFDF5" },
};
const STATUS_LABELS = { open: "Open", in_progress: "In Progress", done: "Done" };
const PRIORITY_COLORS = {
  high:   { color: "#DC2626", bg: "#FEF2F2" },
  medium: { color: "#D97706", bg: "#FFFBEB" },
  low:    { color: "#9B93E8", bg: "#EEEAF8" },
};

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
 *   layerTodos  — array of Todo objects linked to this layer
 */
export default function Section({ title, subtitle, color, children, collapsible = false, forceOpen = false, filled = true, layerTodos = [] }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isOpen = !collapsible || open || forceOpen;
  const [showTasks, setShowTasks] = useState(false);
  const popoverRef = useRef(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showTasks) return;
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowTasks(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showTasks]);

  const hasTasks = layerTodos.length > 0;

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
        {/* Left: indicator dot + title */}
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

        {/* Right: task badge + collapse arrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {hasTasks && (
            <div style={{ position: "relative" }} ref={popoverRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTasks(t => !t); }}
                title="View linked tasks"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px", borderRadius: 6, cursor: "pointer",
                  background: showTasks ? color : "transparent",
                  border: `1px solid ${showTasks ? color : color + "60"}`,
                  color: showTasks ? "#fff" : color,
                  fontSize: 11, fontWeight: 700, fontFamily: F,
                  transition: "all 0.15s",
                }}
              >
                ✓ {layerTodos.length} task{layerTodos.length !== 1 ? "s" : ""}
              </button>

              {showTasks && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: theme.surface,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                    width: 300, zIndex: 60, padding: "10px 0",
                  }}
                >
                  <p style={{ margin: "0 0 8px", padding: "0 14px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Linked Tasks
                  </p>
                  {layerTodos.map((todo, i) => {
                    const isDone = todo.status === "done";
                    const statusCfg = STATUS_COLORS[todo.status] || STATUS_COLORS.open;
                    const priorityCfg = PRIORITY_COLORS[todo.priority] || PRIORITY_COLORS.medium;
                    return (
                      <div
                        key={todo.id}
                        style={{
                          padding: "10px 14px",
                          borderTop: i > 0 ? `1px solid ${theme.borderSubtle || theme.border}` : "none",
                          opacity: isDone ? 0.6 : 1,
                        }}
                      >
                        <p style={{ margin: "0 0 5px", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, textDecoration: isDone ? "line-through" : "none" }}>
                          {todo.title}
                        </p>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: statusCfg.bg, color: statusCfg.color, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {STATUS_LABELS[todo.status] || todo.status}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: priorityCfg.bg, color: priorityCfg.color, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {todo.priority}
                          </span>
                          {todo.due_date && (
                            <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                              {new Date(todo.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        {todo.description && (
                          <p style={{ margin: "5px 0 0", fontSize: 12, color: theme.textMuted, fontFamily: F, lineHeight: 1.5 }}>
                            {todo.description.length > 120 ? todo.description.slice(0, 120) + "…" : todo.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {collapsible && !forceOpen && (
            <span style={{ fontSize: 16, color: isOpen ? color : theme.textMuted, display: "inline-block", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s, color 0.15s", flexShrink: 0 }}>▾</span>
          )}
        </div>
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
