import { F } from "../constants";
import Section from "../components/Section";
import DetailRow from "../components/DetailRow";
import RoadblockCard from "../components/RoadblockCard";
import EditButton from "../components/EditButton";

/**
 * Layer 4 — Intent vs Reality (Delta)
 *
 * Props:
 *   delta      — cf.delta object
 *   isPrinting — force all collapsibles open during print
 *   theme      — theme object from useTheme()
 *   onEdit     — optional callback to jump into the edit form at this section
 */
export default function DeltaSection({ delta, theme, layerTodos = [], onEdit }) {
  if (!delta) return null;

  return (
    <Section
      title="Intent vs Reality"
      subtitle="Log the gap between what was wanted and what was delivered"
      color="#059669"
      layerTodos={layerTodos}
      headerRight={onEdit ? <EditButton color="#059669" onClick={onEdit} /> : null}
    >
      <DetailRow label="User intent " value={delta.user_intent} fullWidth />
      <DetailRow label="Success criteria " value={delta.success_criteria} fullWidth />
      <DetailRow label="What was built " value={delta.actual_build} fullWidth />
      <DetailRow label="Diverged" value={delta.diverged === true ? "Yes" : delta.diverged === false ? "No" : null} />
      <DetailRow label="Divergence reason " value={delta.divergence_reason} fullWidth />
      <DetailRow label="Compromises " value={delta.compromises} fullWidth />

      {delta.roadblocks?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Roadblocks ({delta.roadblocks.length})
          </p>
          {delta.roadblocks.map((r, i) => <RoadblockCard key={r.id || i} rb={r} index={i} />)}
        </div>
      )}
    </Section>
  );
}
