import { useTheme } from "@hooks/useTheme";
import { F, BLUE } from "../constants";

/**
 * Renders an array of strings as colored pill tags.
 * Returns the text "None" (muted) when the list is empty or absent.
 *
 * Props:
 *   items — string[]
 *   color — pill accent color (default Flowpath blue)
 */
export default function TagList({ items, color = BLUE }) {
  const { theme } = useTheme();

  if (!items?.length) {
    return <span style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>None</span>;
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(item => (
        <span
          key={item}
          style={{
            fontSize: 12, padding: "3px 10px", borderRadius: 12,
            background: color + "12", border: `1px solid ${color}30`,
            color, fontFamily: F, fontWeight: 500,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
