import { F } from "../constants";
import Section from "../components/Section";
import DetailRow from "../components/DetailRow";

/**
 * Layer 5 — Decision Reasoning
 *
 * Props:
 *   reasoning  — cf.reasoning object
 *   isPrinting — force all collapsibles open during print
 *   theme      — theme object from useTheme()
 */
export default function ReasoningSection({ reasoning, theme }) {
  if (!reasoning) return null;

  return (
    <Section
      title="Decision Reasoning"
      subtitle="Record the reasoning behind every major decision"
      color="#059669"
    >
      <DetailRow label="Why this structure" value={reasoning.why_structure} fullWidth />
      <DetailRow label="Alternatives considered" value={reasoning.alternatives} fullWidth />
      <DetailRow label="Why rejected" value={reasoning.why_rejected} fullWidth />
      <DetailRow label="Assumptions made" value={reasoning.assumptions} fullWidth />
      <DetailRow label="When NOT to use" value={reasoning.when_opposite} fullWidth />
      <DetailRow label="Lessons learned" value={reasoning.lessons} fullWidth />

      {reasoning.complexity && (
        <div style={{ padding: "10px 0" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Complexity</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div
                key={n}
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  border: `2px solid ${reasoning.complexity >= n ? theme.blue : theme.borderInput}`,
                  background: reasoning.complexity >= n ? theme.blueLight : theme.surface,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span style={{ color: reasoning.complexity >= n ? theme.blue : theme.borderInput, fontSize: 12 }}>◆</span>
              </div>
            ))}
            <span style={{ fontSize: 13, color: theme.textMuted, fontFamily: F }}>
              {["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"][reasoning.complexity]}
            </span>
          </div>
        </div>
      )}
    </Section>
  );
}
