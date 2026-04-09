import { PF } from "../constants";

/**
 * Print-only tag pill list. Returns null when list is empty.
 * Hardcodes light-mode colors.
 *
 * Props:
 *   items — string[]
 *   color — pill accent color (default Flowpath blue)
 */
export default function PrintTagList({ items, color = "#2563EB" }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(item => (
        <span
          key={item}
          style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: color + "12", border: `1px solid ${color}30`, color, fontFamily: PF, fontWeight: 500 }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
