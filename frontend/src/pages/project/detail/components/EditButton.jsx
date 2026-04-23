import { F } from "../constants";

/**
 * Small outline button rendered inside a Section's `headerRight` to jump
 * straight into the edit form at the corresponding step.
 */
export default function EditButton({ color = "#7C3AED", onClick, label = "Edit" }) {
  if (!onClick) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`${label} this section`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 6, cursor: "pointer",
        background: "transparent",
        border: `1px solid ${color}60`,
        color,
        fontSize: 11, fontWeight: 700, fontFamily: F,
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = color; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = color; }}
    >
      ✎ {label}
    </button>
  );
}
