import { F, BLUE } from "../constants";
import Section from "../components/Section";
import DetailRow from "../components/DetailRow";
import TagList from "../components/TagList";
import EditButton from "../components/EditButton";

/**
 * Layer 2 — Who's the client? (Intake)
 *
 * Props:
 *   intake     — cf.intake object
 *   isPrinting — force all collapsibles open during print
 *   theme      — theme object from useTheme()
 *   onEdit     — optional callback to jump into the edit form at this section
 */
export default function IntakeSection({ intake, theme, layerTodos = [], onEdit }) {
  if (!intake) return null;

  return (
    <Section
      title="Who's the client?"
      subtitle="Capture the scenario, industry, team, and tools"
      color="#7C3AED"
      layerTodos={layerTodos}
      headerRight={onEdit ? <EditButton color="#7C3AED" onClick={onEdit} /> : null}
    >
      <DetailRow label="Team size" value={intake.team_size} />
      <DetailRow label="Workflow type" value={intake.workflow_type} />

      {intake.industries?.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
          <TagList items={intake.industries} color={BLUE} />
        </div>
      )}

      {intake.process_frameworks?.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Frameworks</span>
          <TagList items={intake.process_frameworks} color="#7C3AED" />
        </div>
      )}

      {intake.tools?.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Tools in use</span>
          <TagList items={intake.tools} color={theme.textMuted} />
        </div>
      )}

      {intake.pain_points?.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
          <TagList items={intake.pain_points} color="#DC2626" />
        </div>
      )}

      <DetailRow label="Prior attempts" value={intake.prior_attempts} fullWidth />
    </Section>
  );
}
