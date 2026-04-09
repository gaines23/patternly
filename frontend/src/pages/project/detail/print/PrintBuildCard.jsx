import { PF } from "../constants";
import PrintRow from "./PrintRow";
import PrintTagList from "./PrintTagList";

/**
 * Print-only audited build card. Always expanded.
 * Hardcodes light-mode colors.
 *
 * Props:
 *   build — build object from audit.builds[]
 *   index — 0-based index
 */
export default function PrintBuildCard({ build, index }) {
  const urgColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" };

  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#E0F2FE", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: PF }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: PF }}>{build.tool}</span>}
        {build.urgency && (() => {
          const uc = urgColors[build.urgency?.toLowerCase()] || "#9CA3AF";
          return (
            <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: PF }}>
              {build.urgency.toUpperCase()}
            </span>
          );
        })()}
      </div>

      <div style={{ padding: "14px 16px", background: "#fff", borderTop: "1px solid #BAE6FD" }}>
        <PrintRow label="Structure" value={build.structure} fullWidth />
        {build.failure_reasons?.length > 0 && (
          <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              Why it's failing
            </span>
            <PrintTagList items={build.failure_reasons} color="#DC2626" />
          </div>
        )}
        <PrintRow label="What breaks" value={build.what_breaks} fullWidth />
        <PrintRow label="Workarounds" value={build.workarounds_they_use} fullWidth />
        <PrintRow label="How long broken" value={build.how_long_broken} />
        <PrintRow label="Reported by" value={build.who_reported} />
        <PrintRow label="Business impact" value={build.impact_on_team} fullWidth />
      </div>
    </div>
  );
}
