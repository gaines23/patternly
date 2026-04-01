import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useCaseFile, useDeleteCaseFile } from "../../hooks/useCaseFiles";
import { formatDate, satisfactionLabel } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

const STEP_COLORS = {
  audit: "#EA580C",
  intake: "#7C3AED",
  build: "#0284C7",
  delta: "#DC2626",
  reasoning: "#059669",
  outcome: "#4F46E5",
};

function Section({ title, emoji, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px",
        background: color + "0A",
        borderRadius: "12px 12px 0 0",
        borderTop: `3px solid ${color}`,
        borderLeft: `1px solid ${color}25`,
        borderRight: `1px solid ${color}25`,
      }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: F }}>{title}</span>
      </div>
      <div style={{
        background: "#fff",
        border: `1px solid ${color}20`,
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        padding: "20px 18px",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, fullWidth }) {
  if (!value && value !== 0) return null;
  const displayValue = Array.isArray(value)
    ? value.length === 0 ? null : value.join(", ")
    : value;
  if (!displayValue) return null;
  return (
    <div style={{
      display: fullWidth ? "block" : "grid",
      gridTemplateColumns: "180px 1fr",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid #F9FAFB",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: fullWidth ? 0 : 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6, marginTop: fullWidth ? 6 : 0 }}>
        {typeof displayValue === "boolean"
          ? displayValue ? "Yes" : "No"
          : displayValue}
      </span>
    </div>
  );
}

function TagList({ items, color = BLUE }) {
  if (!items?.length) return <span style={{ fontSize: 13, color: "#9CA3AF", fontFamily: F }}>None</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(item => (
        <span key={item} style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 12,
          background: color + "12", border: `1px solid ${color}30`,
          color, fontFamily: F, fontWeight: 500,
        }}>{item}</span>
      ))}
    </div>
  );
}

function SatisfactionStars({ score }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ fontSize: 20, color: score >= n ? "#F59E0B" : "#E5E7EB" }}>
            {score >= n ? "★" : "☆"}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 13, color: "#6B7280", fontFamily: F }}>
        {satisfactionLabel(score)}
      </span>
    </div>
  );
}

function RoadblockCard({ rb, index }) {
  const sevColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" };
  const sc = sevColors[rb.severity] || "#9CA3AF";
  return (
    <div style={{
      border: `1px solid ${sc}30`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 10,
      background: sc + "05",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: F }}>
          Roadblock {index + 1}
        </span>
        {rb.severity && (
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {rb.severity.toUpperCase()}
          </span>
        )}
        {rb.type && (
          <span style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>
            {rb.type.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <Row label="Description" value={rb.description} fullWidth />
      <Row label="Tools affected" value={rb.tools_affected} />
      <Row label="Workaround found" value={rb.workaround_found === true ? "Yes" : rb.workaround_found === false ? "No" : null} />
      <Row label="Workaround" value={rb.workaround_description} fullWidth />
      <Row label="Time cost" value={rb.time_cost_hours ? `${rb.time_cost_hours}h` : null} />
      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Future warning: </span>
          <span style={{ fontSize: 13, color: "#92400E", fontFamily: F }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}

function CurrentBuildCard({ build, index }) {
  const urgColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" };
  const uc = urgColors[build.urgency?.toLowerCase()] || "#9CA3AF";
  return (
    <div style={{ border: "1px solid #FED7AA", borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: "#FFFBF5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#EA580C", fontFamily: F }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: F }}>{build.tool}</span>}
        {build.urgency && (
          <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {build.urgency.toUpperCase()}
          </span>
        )}
      </div>
      <Row label="Structure" value={build.structure} fullWidth />
      {build.failure_reasons?.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Why it's failing</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {build.failure_reasons.map(r => (
              <span key={r} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontFamily: F }}>{r}</span>
            ))}
          </div>
        </div>
      )}
      <Row label="What breaks" value={build.what_breaks} fullWidth />
      <Row label="Workarounds" value={build.workarounds_they_use} fullWidth />
      <Row label="How long broken" value={build.how_long_broken} />
      <Row label="Reported by" value={build.who_reported} />
      <Row label="Business impact" value={build.impact_on_team} fullWidth />
    </div>
  );
}

export default function CaseFileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = location.state?.justCreated;

  const { data: cf, isLoading, isError } = useCaseFile(id);
  const deleteMutation = useDeleteCaseFile();

  const handleDelete = async () => {
    if (!window.confirm("Delete this case file? This cannot be undone.")) return;
    await deleteMutation.mutateAsync(id);
    navigate("/case-files");
  };

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF", fontFamily: F }}>
        Loading case file…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p style={{ color: "#EF4444", fontFamily: F, marginBottom: 16 }}>Failed to load case file.</p>
        <Link to="/case-files" style={{ color: BLUE, fontFamily: F }}>← Back to case files</Link>
      </div>
    );
  }

  const { audit, intake, build, delta, reasoning, outcome } = cf;

  return (
    <div style={{ padding: "28px 32px 80px", maxWidth: 900 }}>

      {/* Success banner */}
      {justCreated && (
        <div style={{ padding: "12px 16px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 14, color: "#065F46", fontFamily: F, fontWeight: 600 }}>
            Case file saved successfully. It's now part of the knowledge base.
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <Link to="/case-files" style={{ fontSize: 13, color: "#9CA3AF", fontFamily: F, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
            ← Case files
          </Link>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontFamily: "'Fraunces', serif" }}>
            {cf.workflow_type || "Untitled workflow"}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#6B7280", fontFamily: F }}>
            <span>Logged by <strong style={{ color: "#374151" }}>{cf.logged_by_name || "—"}</strong></span>
            <span>·</span>
            <span>{formatDate(cf.created_at)}</span>
            {cf.satisfaction_score && (
              <>
                <span>·</span>
                <span>{cf.satisfaction_score}/5 satisfaction</span>
              </>
            )}
            {cf.roadblock_count > 0 && (
              <>
                <span>·</span>
                <span style={{ color: "#EA580C" }}>{cf.roadblock_count} roadblock{cf.roadblock_count !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to={`/case-files/${id}/edit`}>
            <button style={{ padding: "9px 18px", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#374151", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}>
              Edit
            </button>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{ padding: "9px 18px", background: "#fff", border: "1.5px solid #FECACA", borderRadius: 9, color: "#EF4444", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
        {cf.industries?.map(i => (
          <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", color: BLUE, fontFamily: F, fontWeight: 500 }}>{i}</span>
        ))}
        {cf.tools?.slice(0, 6).map(t => (
          <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#6B7280", fontFamily: F }}>{t}</span>
        ))}
        {cf.process_frameworks?.slice(0, 4).map(f => (
          <span key={f} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontFamily: F }}>{f}</span>
        ))}
      </div>

      {/* ── Layer 1: Audit ──────────────────────────────────────────────── */}
      {audit && (
        <Section title="Current State Audit" emoji="🔍" color={STEP_COLORS.audit}>
          <Row label="Has existing setup" value={audit.has_existing === true ? "Yes" : audit.has_existing === false ? "No — greenfield" : "—"} />
          <Row label="Overall assessment" value={audit.overall_assessment} fullWidth />
          <Row label="Tried to fix before" value={audit.tried_to_fix === true ? "Yes" : audit.tried_to_fix === false ? "No" : null} />
          <Row label="Previous fixes" value={audit.previous_fixes} fullWidth />
          {audit.builds?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Builds audited ({audit.builds.length})
              </p>
              {audit.builds.map((b, i) => <CurrentBuildCard key={b.id} build={b} index={i} />)}
            </div>
          )}
          {audit.pattern_summary && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pattern summary</p>
              <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontFamily: F, lineHeight: 1.6 }}>{audit.pattern_summary}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 2: Intake ─────────────────────────────────────────────── */}
      {intake && (
        <Section title="Scenario Intake" emoji="📋" color={STEP_COLORS.intake}>
          {intake.raw_prompt && (
            <div style={{ padding: "12px 14px", background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 8, marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw prompt</p>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", fontFamily: F, lineHeight: 1.7, fontStyle: "italic" }}>"{intake.raw_prompt}"</p>
            </div>
          )}
          <Row label="Team size" value={intake.team_size} />
          <Row label="Workflow type" value={intake.workflow_type} />
          {intake.industries?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
              <TagList items={intake.industries} color={BLUE} />
            </div>
          )}
          {intake.process_frameworks?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Frameworks</span>
              <TagList items={intake.process_frameworks} color="#7C3AED" />
            </div>
          )}
          {intake.tools?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Tools in use</span>
              <TagList items={intake.tools} color="#374151" />
            </div>
          )}
          {intake.pain_points?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
              <TagList items={intake.pain_points} color="#DC2626" />
            </div>
          )}
          <Row label="Prior attempts" value={intake.prior_attempts} fullWidth />
        </Section>
      )}

      {/* ── Layer 3: Build ──────────────────────────────────────────────── */}
      {build && (
        <Section title="Build Documentation" emoji="🏗️" color={STEP_COLORS.build}>
          <Row label="Spaces" value={build.spaces} />
          <Row label="Lists" value={build.lists} />
          <Row label="Status flow" value={build.statuses} />
          {build.custom_fields && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Custom fields</span>
              <pre style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: "monospace", background: "#F9FAFB", padding: "10px 12px", borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{build.custom_fields}</pre>
            </div>
          )}
          {build.automations && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Automations</span>
              <pre style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: "monospace", background: "#F9FAFB", padding: "10px 12px", borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{build.automations}</pre>
            </div>
          )}
          {build.integrations?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Integrations</span>
              <TagList items={build.integrations} color="#0284C7" />
            </div>
          )}
          <Row label="Build notes" value={build.build_notes} fullWidth />
        </Section>
      )}

      {/* ── Layer 4: Delta ──────────────────────────────────────────────── */}
      {delta && (
        <Section title="Intent vs Reality" emoji="⚖️" color={STEP_COLORS.delta}>
          <Row label="User intent" value={delta.user_intent} fullWidth />
          <Row label="Success criteria" value={delta.success_criteria} fullWidth />
          <Row label="What was built" value={delta.actual_build} fullWidth />
          <Row label="Diverged" value={delta.diverged === true ? "Yes" : delta.diverged === false ? "No" : null} />
          <Row label="Divergence reason" value={delta.divergence_reason} fullWidth />
          <Row label="Compromises" value={delta.compromises} fullWidth />
          {delta.roadblocks?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Roadblocks ({delta.roadblocks.length})
              </p>
              {delta.roadblocks.map((r, i) => <RoadblockCard key={r.id} rb={r} index={i} />)}
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 5: Reasoning ─────────────────────────────────────────── */}
      {reasoning && (
        <Section title="Decision Reasoning" emoji="🧠" color={STEP_COLORS.reasoning}>
          <Row label="Why this structure" value={reasoning.why_structure} fullWidth />
          <Row label="Alternatives considered" value={reasoning.alternatives} fullWidth />
          <Row label="Why rejected" value={reasoning.why_rejected} fullWidth />
          <Row label="Assumptions made" value={reasoning.assumptions} fullWidth />
          <Row label="When NOT to use" value={reasoning.when_opposite} fullWidth />
          <Row label="Lessons learned" value={reasoning.lessons} fullWidth />
          {reasoning.complexity && (
            <div style={{ padding: "10px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Complexity</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${reasoning.complexity >= n ? BLUE : "#E5E7EB"}`, background: reasoning.complexity >= n ? "#EFF6FF" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: reasoning.complexity >= n ? BLUE : "#D1D5DB", fontSize: 12 }}>◆</span>
                  </div>
                ))}
                <span style={{ fontSize: 13, color: "#6B7280", fontFamily: F }}>
                  {["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"][reasoning.complexity]}
                </span>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 6: Outcome ───────────────────────────────────────────── */}
      {outcome && (
        <Section title="Outcome Capture" emoji="✅" color={STEP_COLORS.outcome}>
          <Row label="Did they build it" value={outcome.built ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1) : null} />
          <Row label="Block reason" value={outcome.block_reason} fullWidth />
          <Row label="What changed" value={outcome.changes} fullWidth />
          <Row label="What worked" value={outcome.what_worked} fullWidth />
          <Row label="What failed" value={outcome.what_failed} fullWidth />
          <Row label="Revisit when" value={outcome.revisit_when} fullWidth />
          {outcome.satisfaction && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
              <SatisfactionStars score={outcome.satisfaction} />
            </div>
          )}
          <Row label="Would recommend" value={outcome.recommend ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1) : null} />
        </Section>
      )}
    </div>
  );
}
