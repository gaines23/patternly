import { useTheme } from "@hooks/useTheme";
import { satisfactionLabel } from "@utils/transforms";
import { F } from "../constants";

/**
 * Displays a 1–5 star rating with a text label.
 *
 * Props:
 *   score — number 1–5
 */
export default function SatisfactionStars({ score }) {
  const { theme } = useTheme();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ fontSize: 20, color: score >= n ? "#F59E0B" : theme.border }}>
            {score >= n ? "★" : "☆"}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 13, color: theme.textMuted, fontFamily: F }}>
        {satisfactionLabel(score)}
      </span>
    </div>
  );
}
