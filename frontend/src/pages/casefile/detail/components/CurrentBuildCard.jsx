import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";
import DetailRow from "./DetailRow";

/**
 * Collapsible card for a single audited build entry.
 *
 * Props:
 *   build — build object from audit.builds[]
 *   index — 0-based index (displayed as "Build N")
 */
export default function CurrentBuildCard({ build, index }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);

  const urgColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" };
  const uc = urgColors[build.urgency?.toLowerCase()] || "#9CA3AF";

  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
          background: open ? "#E0F2FE" : theme.surface,
          cursor: "pointer", userSelect: "none", flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>{build.tool}</span>}
        {build.urgency && (
          <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {build.urgency.toUpperCase()}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#0284C7", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>

      <div className="fp-collapsible-body" style={{ display: open ? undefined : "none", padding: "14px 16px", background: theme.surface, borderTop: "1px solid #BAE6FD" }}>
        <DetailRow label="Structure" value={build.structure} fullWidth />

        {build.failure_reasons?.length > 0 && (
          <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
              Why it's failing
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {build.failure_reasons.map(r => (
                <span key={r} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontFamily: F }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        <DetailRow label="What breaks" value={build.what_breaks} fullWidth />
        <DetailRow label="Workarounds" value={build.workarounds_they_use} fullWidth />
        <DetailRow label="How long broken" value={build.how_long_broken} />
        <DetailRow label="Reported by" value={build.who_reported} />
        <DetailRow label="Business impact" value={build.impact_on_team} fullWidth />
      </div>
    </div>
  );
}
