import { F } from "../constants";
import Section from "../components/Section";
import DetailRow from "../components/DetailRow";
import SatisfactionStars from "../components/SatisfactionStars";

/**
 * Layer 6 — Outcome
 *
 * Props:
 *   outcome    — cf.outcome object
 *   isPrinting — force all collapsibles open during print
 *   theme      — theme object from useTheme()
 */
export default function OutcomeSection({ outcome, isPrinting, theme }) {
  if (!outcome) return null;

  return (
    <Section
      title="Outcome"
      subtitle="Capture the post-build result and long-term usage signal"
      color="#059669"
      collapsible
      forceOpen={isPrinting}
    >
      <DetailRow label="Did they build it" value={outcome.built ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1) : null} />
      <DetailRow label="Block reason" value={outcome.block_reason} fullWidth />
      <DetailRow label="What changed" value={outcome.changes} fullWidth />
      <DetailRow label="What worked" value={outcome.what_worked} fullWidth />
      <DetailRow label="What failed" value={outcome.what_failed} fullWidth />
      <DetailRow label="Revisit when" value={outcome.revisit_when} fullWidth />

      {outcome.satisfaction && (
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
          <SatisfactionStars score={outcome.satisfaction} />
        </div>
      )}

      <DetailRow label="Would recommend" value={outcome.recommend ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1) : null} />
    </Section>
  );
}
