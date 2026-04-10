import { F } from "../constants";
import Section from "../components/Section";
import DetailRow from "../components/DetailRow";
import CurrentBuildCard from "../components/CurrentBuildCard";

/**
 * Layer 1 — What's in place now? (Audit)
 *
 * Props:
 *   audit  — cf.audit object
 *   theme  — theme object from useTheme()
 */
export default function AuditSection({ audit, theme, layerTodos = [] }) {
  if (!audit) return null;

  return (
    <Section
      title="What's in place now?"
      subtitle="Document the client's current setup and what's breaking"
      color="#7C3AED"
      layerTodos={layerTodos}
    >
      <DetailRow label="Has existing setup" value={audit.has_existing === true ? "Yes" : audit.has_existing === false ? "No — greenfield" : "—"} />
      <DetailRow label="Overall assessment " value={audit.overall_assessment} fullWidth />
      <DetailRow label="Tried to fix before" value={audit.tried_to_fix === true ? "Yes" : audit.tried_to_fix === false ? "No" : null} />
      <DetailRow label="Previous fixes" value={audit.previous_fixes} fullWidth />

      {audit.pattern_summary && (
        <div style={{ marginTop: 14, padding: "12px 14px", background: "#EA580C12", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pattern summary</p>
          <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.6 }}>{audit.pattern_summary}</p>
        </div>
      )}

      {audit.builds?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Builds audited ({audit.builds.length})
          </p>
          {audit.builds.map((b, i) => <CurrentBuildCard key={b.id || i} build={b} index={i} />)}
        </div>
      )}

    </Section>
  );
}
