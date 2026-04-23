import { Link } from "react-router-dom";
import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * PageActionButton
 *
 * The canonical "+ New X" / "+ Ingest Y" action button used in the top-right
 * of list pages (Projects, Tasks, Patterns, etc). Replaces the ~identical
 * inline button styles scattered across pages to ensure visual consistency.
 *
 * Usage:
 *   <PageActionButton to="/projects/new">New Project</PageActionButton>
 *   <PageActionButton onClick={() => setOpen(true)}>New Task</PageActionButton>
 *   <PageActionButton onClick={...} toggled={showForm} toggledLabel="Close">
 *     Ingest source
 *   </PageActionButton>
 *
 * Props:
 *   to            — if provided, renders as a <Link> (react-router)
 *   onClick       — click handler (used when no `to`)
 *   icon          — prefix string, defaults to "+". Pass null/"" to omit
 *   toggled       — boolean, swaps to "toggled" style + label
 *   toggledLabel  — label shown when toggled (e.g. "Close")
 *   variant       — "primary" (default blue) | "accent" (purple #9B93E8)
 *   disabled      — disables the button
 */
export default function PageActionButton({
  children,
  to,
  onClick,
  icon = "+",
  toggled = false,
  toggledLabel = "Close",
  variant = "primary",
  disabled = false,
  style = {},
}) {
  const { theme } = useTheme();

  const bgColor = variant === "accent" ? "#9B93E8" : theme.blue;

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    background: toggled ? theme.surface : bgColor,
    border: `1.5px solid ${toggled ? theme.borderInput : bgColor}`,
    borderRadius: 10,
    color: toggled ? theme.text : "#fff",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: F,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    transition: "background 0.15s, box-shadow 0.15s",
    opacity: disabled ? 0.6 : 1,
    textDecoration: "none",
    ...style,
  };

  const label = toggled
    ? toggledLabel
    : icon
    ? `${icon} ${children}`
    : children;

  if (to && !disabled) {
    return (
      <Link to={to} style={{ textDecoration: "none" }}>
        <button type="button" style={baseStyle} disabled={disabled}>
          {label}
        </button>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} style={baseStyle}>
      {label}
    </button>
  );
}
