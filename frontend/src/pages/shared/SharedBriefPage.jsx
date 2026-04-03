import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicApi from "../../api/publicClient";

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
  if (!items?.length) return null;
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

function RoadblockCard({ rb, index }) {
  const sevColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" };
  const sc = sevColors[rb.severity] || "#9CA3AF";
  return (
    <div style={{
      border: `1px solid ${sc}30`, borderLeft: `3px solid ${sc}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: sc + "05",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: F }}>Roadblock {index + 1}</span>
        {rb.severity && (
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {rb.severity.toUpperCase()}
          </span>
        )}
        {rb.type && <span style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>{rb.type.replace(/_/g, " ")}</span>}
      </div>
      <Row label="Description" value={rb.description} fullWidth />
      <Row label="Tools affected" value={rb.tools_affected} />
      <Row label="Workaround" value={rb.workaround_description} fullWidth />
      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Note: </span>
          <span style={{ fontSize: 13, color: "#92400E", fontFamily: F }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}

export default function SharedBriefPage() {
  const { shareToken } = useParams();

  const { data: cf, isLoading, isError, error } = useQuery({
    queryKey: ["publicBrief", shareToken],
    queryFn: async () => {
      const { data } = await publicApi.get(`/v1/briefs/shared/${shareToken}/`);
      return data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, color: "#9CA3AF" }}>
        Loading brief…
      </div>
    );
  }

  if (isError) {
    const msg = error?.response?.data?.detail || "This link is invalid or has been disabled.";
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🔒</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Link unavailable</p>
          <p style={{ fontSize: 14, color: "#6B7280" }}>{msg}</p>
        </div>
      </div>
    );
  }

  const { audit, intake, build, delta, reasoning, outcome, project_updates } = cf;

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Branded top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Flowpath
        </span>
        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 12px" }}>
          Read-only · Client brief
        </span>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontFamily: "'Fraunces', serif", color: "#111827" }}>
            {cf.name || cf.workflow_type || "Workspace Blueprint"}
          </h1>
          {cf.name && cf.workflow_type && (
            <p style={{ margin: "0 0 10px", fontSize: 15, color: "#6B7280", fontFamily: F }}>{cf.workflow_type}</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#6B7280", fontFamily: F }}>
            {cf.logged_by_name && (
              <span>Prepared by <strong style={{ color: "#374151" }}>{cf.logged_by_name}</strong></span>
            )}
            {cf.team_size && <><span>·</span><span>{cf.team_size} team</span></>}
          </div>
        </div>

        {/* Meta chips */}
        {(cf.industries?.length > 0 || cf.tools?.length > 0 || cf.process_frameworks?.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
            {cf.industries?.map(i => (
              <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", color: BLUE, fontFamily: F, fontWeight: 500 }}>{i}</span>
            ))}
            {cf.tools?.slice(0, 8).map(t => (
              <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#6B7280", fontFamily: F }}>{t}</span>
            ))}
            {cf.process_frameworks?.slice(0, 4).map(f => (
              <span key={f} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontFamily: F }}>{f}</span>
            ))}
          </div>
        )}

        {/* Audit */}
        {audit && (audit.overall_assessment || audit.builds?.length > 0) && (
          <Section title="Current State Audit" emoji="🔍" color={STEP_COLORS.audit}>
            <Row label="Overall assessment" value={audit.overall_assessment} fullWidth />
            <Row label="Pattern summary" value={audit.pattern_summary} fullWidth />
            {audit.builds?.map((b, i) => (
              <div key={b.id || i} style={{ border: "1px solid #FED7AA", borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: "#FFFBF5", marginTop: i === 0 ? 12 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#EA580C", fontFamily: F }}>Current tool {i + 1}</span>
                  {b.tool && <span style={{ fontSize: 13, color: "#374151", fontFamily: F, fontWeight: 600 }}>{b.tool}</span>}
                </div>
                <Row label="Structure" value={b.structure} fullWidth />
                <Row label="What breaks" value={b.what_breaks} fullWidth />
                <Row label="Workarounds" value={b.workarounds_they_use} fullWidth />
              </div>
            ))}
          </Section>
        )}

        {/* Intake */}
        {intake && (intake.pain_points?.length > 0 || intake.raw_prompt) && (
          <Section title="Scope & Context" emoji="📋" color={STEP_COLORS.intake}>
            <Row label="Overview" value={intake.raw_prompt} fullWidth />
            {intake.pain_points?.length > 0 && (
              <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
                <TagList items={intake.pain_points} color="#7C3AED" />
              </div>
            )}
            <Row label="Workflow type" value={intake.workflow_type} />
            <Row label="Prior attempts" value={intake.prior_attempts} fullWidth />
          </Section>
        )}

        {/* Build */}
        {build && (build.spaces || build.statuses || build.automations || build.build_notes || build.workflows?.length > 0) && (
          <Section title="Workspace Blueprint" emoji="🏗️" color={STEP_COLORS.build}>
            <Row label="Spaces" value={build.spaces} fullWidth />
            <Row label="Lists" value={build.lists} fullWidth />
            <Row label="Statuses" value={build.statuses} fullWidth />
            <Row label="Custom fields" value={build.custom_fields} fullWidth />
            <Row label="Automations" value={build.automations} fullWidth />
            {build.integrations?.length > 0 && (
              <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Integrations</span>
                <TagList items={build.integrations} color="#0284C7" />
              </div>
            )}
            <Row label="Build notes" value={build.build_notes} fullWidth />
            {build.workflows?.map((wf, i) => (
              <div key={i} style={{ border: "1px solid #BAE6FD", borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: "#F0F9FF", marginTop: i === 0 ? 12 : 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>Workflow {i + 1}</span>
                {wf.name && <span style={{ fontSize: 13, color: "#374151", fontFamily: F, fontWeight: 600, marginLeft: 8 }}>{wf.name}</span>}
                {wf.description && <p style={{ margin: "8px 0 0", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6 }}>{wf.description}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* Delta / Roadblocks */}
        {delta && (delta.user_intent || delta.success_criteria || delta.roadblocks?.length > 0) && (
          <Section title="Scope & Known Challenges" emoji="⚡" color={STEP_COLORS.delta}>
            <Row label="Your intent" value={delta.user_intent} fullWidth />
            <Row label="Success criteria" value={delta.success_criteria} fullWidth />
            {delta.roadblocks?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                  Known roadblocks ({delta.roadblocks.length})
                </span>
                {delta.roadblocks.map((rb, i) => <RoadblockCard key={rb.id || i} rb={rb} index={i} />)}
              </div>
            )}
          </Section>
        )}

        {/* Reasoning */}
        {reasoning && (reasoning.why_structure || reasoning.alternatives) && (
          <Section title="Design Rationale" emoji="💡" color={STEP_COLORS.reasoning}>
            <Row label="Why this structure" value={reasoning.why_structure} fullWidth />
            <Row label="Alternatives considered" value={reasoning.alternatives} fullWidth />
            <Row label="Why they were rejected" value={reasoning.why_rejected} fullWidth />
            <Row label="Assumptions" value={reasoning.assumptions} fullWidth />
            <Row label="Lessons learned" value={reasoning.lessons} fullWidth />
          </Section>
        )}

        {/* Outcome */}
        {outcome && (outcome.built || outcome.what_worked || outcome.what_failed) && (
          <Section title="Outcome" emoji="✅" color={STEP_COLORS.outcome}>
            <Row label="Build status" value={outcome.built} />
            <Row label="What worked" value={outcome.what_worked} fullWidth />
            <Row label="What failed" value={outcome.what_failed} fullWidth />
            <Row label="Changes made" value={outcome.changes} fullWidth />
            {outcome.satisfaction > 0 && (
              <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <span key={n} style={{ fontSize: 20, color: outcome.satisfaction >= n ? "#F59E0B" : "#E5E7EB" }}>
                      {outcome.satisfaction >= n ? "★" : "☆"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Project updates */}
        {project_updates?.length > 0 && (
          <Section title="Project Updates" emoji="📝" color="#0284C7">
            {project_updates.map((pu, i) => {
              const dateLabel = pu.created_at
                ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
                : "—";
              return (
                <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                    {pu.attachments?.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pu.attachments.map((att, ai) => att.url && (
                          <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F, fontWeight: 500, textDecoration: "none" }}>
                            📎 {att.name || att.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Section>
        )}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E7EB", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
            This brief was shared with you via <strong style={{ color: "#6B7280" }}>Flowpath</strong> · Read-only view
          </p>
        </div>
      </div>
    </div>
  );
}
