import { PF } from "../constants";
import PrintRow from "./PrintRow";

/**
 * Print-only roadblock card. Always expanded.
 * Hardcodes light-mode colors.
 *
 * Props:
 *   rb    — roadblock object from delta.roadblocks[]
 *   index — 0-based index
 */
export default function PrintRoadblockCard({ rb, index }) {
  const sevColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" };
  const sc = sevColors[rb.severity] || "#9CA3AF";

  return (
    <div style={{ border: `1px solid ${sc}30`, borderLeft: `3px solid ${sc}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: sc + "05" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: PF }}>Roadblock {index + 1}</span>
        {rb.severity && (
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: PF }}>
            {rb.severity.toUpperCase()}
          </span>
        )}
        {rb.type && (
          <span style={{ fontSize: 12, color: "#6B7280", fontFamily: PF }}>{rb.type.replace(/_/g, " ")}</span>
        )}
      </div>

      <PrintRow label="Description" value={rb.description} fullWidth />
      <PrintRow label="Tools affected" value={rb.tools_affected} />
      <PrintRow label="Workaround" value={rb.workaround_description} fullWidth />

      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Note: </span>
          <span style={{ fontSize: 13, color: "#92400E", fontFamily: PF }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}
