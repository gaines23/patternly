import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";
import DetailRow from "./DetailRow";

/**
 * Severity-coloured card for a single roadblock entry.
 *
 * Props:
 *   rb    — roadblock object from delta.roadblocks[]
 *   index — 0-based index (displayed as "Roadblock N")
 */
export default function RoadblockCard({ rb, index }) {
  const { theme } = useTheme();
  const sevColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" };
  const sc = sevColors[rb.severity] || "#9CA3AF";

  return (
    <div style={{
      border: `1px solid ${sc}30`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 10,
      background: sc + "08",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, fontFamily: F }}>
          Roadblock {index + 1}
        </span>
        {rb.severity && (
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {rb.severity.toUpperCase()}
          </span>
        )}
        {rb.type && (
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
            {rb.type.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <DetailRow label="Description " value={rb.description} fullWidth />
      <DetailRow label="Tools affected" value={rb.tools_affected} />
      <DetailRow label="Workaround found" value={rb.workaround_found === true ? "Yes" : rb.workaround_found === false ? "No" : null} />
      <DetailRow label="Workaround " value={rb.workaround_description} fullWidth />
      <DetailRow label="Time cost" value={rb.time_cost_hours ? `${rb.time_cost_hours}h` : null} />

      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#EA580C12", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Future warning: </span>
          <span style={{ fontSize: 13, color: theme.textSec, fontFamily: F }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}
