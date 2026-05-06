import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicApi from "../../api/publicClient";
import ProjectDetailHeader from "../../components/ProjectDetailHeader";
import { WorkflowMapPanel } from "../../components/WorkflowMapPanel";
import { PatternlyMark } from "../../components/brand/PatternlyMark";
import { formatMinutes, totalUpdatesDuration } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#9B93E8";

function UpdateItem({ pu }) {
  const [open, setOpen] = useState(false);
  const dateLabel = pu.created_at
    ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
    : "—";
  const durationLabel = formatMinutes(pu.minutes_spent);
  return (
    <div style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: open ? "1px solid #BAE6FD" : "none", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
        {durationLabel && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>⏱ {durationLabel}</span>
        )}
        {pu.attachments?.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 14, color: "#0284C7", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▾</span>
      </div>
      {open && (
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
      )}
    </div>
  );
}

function renderSummary(text, maxKeyUpdates = 5) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let inKeyUpdates = false;
  let bulletCount = 0;
  let suppress = false;

  lines.forEach((line, li) => {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (!suppress) out.push(<div key={li} style={{ height: 8 }} />);
      return;
    }

    const boldOnlyMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    const isDateHeader = /^\*\*\d{1,2}\/\d{1,2}\/\d{2,4}\*\*/.test(trimmed);

    if (boldOnlyMatch && !isDateHeader) {
      inKeyUpdates = /key updates/i.test(boldOnlyMatch[1]);
      bulletCount = 0;
      suppress = false;
      out.push(<p key={li} style={{ margin: "14px 0 4px", fontSize: 14, fontWeight: 700, color: "#1F2937", fontFamily: F }}>{boldOnlyMatch[1]}</p>);
      return;
    }

    if (inKeyUpdates && suppress) return;

    if (inKeyUpdates && trimmed.startsWith("- ")) {
      bulletCount++;
      if (bulletCount > maxKeyUpdates) {
        suppress = true;
        return;
      }
    }

    if (boldOnlyMatch) {
      out.push(<p key={li} style={{ margin: "14px 0 4px", fontSize: 14, fontWeight: 700, color: "#1F2937", fontFamily: F }}>{boldOnlyMatch[1]}</p>);
      return;
    }

    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    const rendered = parts.map((part, pi) => {
      const m = part.match(/^\*\*(.*?)\*\*$/);
      if (m) return <strong key={pi}>{m[1]}</strong>;
      return <span key={pi}>{part}</span>;
    });
    out.push(<p key={li} style={{ margin: "2px 0", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7 }}>{rendered}</p>);
  });
  return out;
}

function Section({ title, subtitle, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        background: `${color}12`,
        borderRadius: "10px 10px 0 0",
        border: `1px solid ${color}40`,
        borderBottom: `1.5px solid ${color}50`,
      }}>
        <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>✓</span>
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color, fontFamily: F }}>{title}</p>
          {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: F }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{
        background: "#fff",
        border: `1px solid ${color}40`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        padding: "18px 14px",
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
      <span style={{ fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6, marginTop: fullWidth ? 10 : 0, display: fullWidth ? "block" : "inline" }}>
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

function CurrentBuildCard({ build, index }) {
  const [open, setOpen] = useState(false);
  const urgColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" };
  const uc = urgColors[build.urgency?.toLowerCase()] || "#9CA3AF";
  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: open ? "#E0F2FE" : "#fff", cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: F }}>{build.tool}</span>}
        {build.urgency && (
          <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {build.urgency.toUpperCase()}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#0284C7", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "14px 16px", background: "#fff", borderTop: "1px solid #BAE6FD" }}>
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
      )}
    </div>
  );
}

function CollapsibleCard({ title, badge, action, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid #BAE6FD", borderRadius: 12, marginBottom: 14, background: "#0284C710", overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
      >
        {badge}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: F }}>{title}</span>
        {action && (
          <span onClick={e => e.stopPropagation()} style={{ display: "inline-flex" }}>
            {action}
          </span>
        )}
        <span style={{ fontSize: 11, color: "#0284C7", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          {children}
        </div>
      )}
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
  const [mapWfIndex, setMapWfIndex] = useState(null);

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
        {cf.team_logo_url ? (
          <img src={cf.team_logo_url} alt="" style={{ height: 32, maxWidth: 240, objectFit: "contain", display: "block" }} />
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <PatternlyMark size={32} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Patternly
            </span>
          </span>
        )}
        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 12px" }}>
          Read-only · Client brief
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* Header (shared component) */}
        <ProjectDetailHeader cf={cf} />

        {/* Progress Overview & Key Updates (AI summary) */}
        {cf.updates_summary && (
          <Section title="Progress Overview" subtitle="AI-generated summary of updates and scope changes" color="#6366F1">
            <div style={{ fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.8 }}>
              {renderSummary(cf.updates_summary)}
            </div>
          </Section>
        )}

        {/* Project Updates */}
        {project_updates?.length > 0 && (
          <Section
            title="Project Updates"
            subtitle={totalUpdatesDuration(project_updates) ? `Total time spent: ${totalUpdatesDuration(project_updates)}` : null}
            color="#0284C7"
          >
            {[...project_updates]
              .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
              .map((pu, i) => <UpdateItem key={pu.id || i} pu={pu} />)
            }
          </Section>
        )}

        {/* Scope Creep */}
        {delta?.scope_creep?.length > 0 && (
          <Section title="Scope Creep" color="#D97706">
            {delta.scope_creep.map((sc, i) => (
              <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
                {sc.reason && <Row label="Why added" value={sc.reason} fullWidth />}
                {sc.impact && <Row label="Impact" value={sc.impact} fullWidth />}
                {sc.communicated != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F,
                      color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                      background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                      border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                      borderRadius: 8, padding: "2px 10px" }}>
                      {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* What's in place now — Audit */}
        {audit && (audit.overall_assessment || audit.pattern_summary) && (
          <Section title="What's in place now?" subtitle="Document the client's current setup and what's breaking" color="#7C3AED">
            <Row label="Overall assessment" value={audit.overall_assessment} fullWidth />
            <Row label="Pattern summary" value={audit.pattern_summary} fullWidth />
          </Section>
        )}

        {/* Who's the client — Intake */}
        {intake && (intake.workflow_type || intake.team_size || intake.industries?.length > 0 || intake.tools?.length > 0 || intake.pain_points?.length > 0 || intake.process_frameworks?.length > 0 || intake.prior_attempts) && (
          <Section title="Who's the client?" subtitle="Capture the scenario, industry, team, and tools" color="#7C3AED">
            <Row label="Team size" value={intake.team_size} />
            <Row label="Workflow type" value={intake.workflow_type} />
            {intake.industries?.length > 0 && (
              <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
                <TagList items={intake.industries} color="#9B93E8" />
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
                <TagList items={intake.tools} color="#6B7280" />
              </div>
            )}
            {intake.pain_points?.length > 0 && (
              <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
                <TagList items={intake.pain_points} color="#7C3AED" />
              </div>
            )}
            <Row label="Prior attempts" value={intake.prior_attempts} fullWidth />
          </Section>
        )}

        {/* Build Documentation */}
        {(build || audit?.builds?.length > 0) && (
          <Section title="Build Documentation" subtitle="Document everything that was built" color="#0284C7">
            {audit?.builds?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  Builds audited ({audit.builds.length})
                </p>
                {audit.builds.map((b, i) => <CurrentBuildCard key={b.id || i} build={b} index={i} />)}
              </div>
            )}
            {build?.spaces && (
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Spaces</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {build.spaces.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {build?.workflows?.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {build.workflows.map((wf, wi) => (
                  <CollapsibleCard
                    key={wi}
                    title={wf.name || `Workflow ${wi + 1}`}
                    badge={<span style={{ width: 24, height: 24, borderRadius: 6, background: "#0284C7", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: F, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{wi + 1}</span>}
                    action={
                      <button
                        onClick={() => setMapWfIndex(mapWfIndex === wi ? null : wi)}
                        style={{
                          fontSize: 11, fontWeight: 600, fontFamily: F,
                          color: mapWfIndex === wi ? "#fff" : "#0284C7",
                          background: mapWfIndex === wi ? "#0284C7" : "#E0F2FE",
                          border: "1px solid #BAE6FD",
                          borderRadius: 6, padding: "3px 10px",
                          cursor: "pointer", lineHeight: 1.4,
                        }}
                      >
                        {mapWfIndex === wi ? "✕ Map" : "Map ↗"}
                      </button>
                    }
                  >
                    {wf.notes && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6, fontStyle: "italic" }}>{wf.notes}</p>}
                    {wf.lists?.map((l, li) => (
                      <div key={li} style={{ border: `1px solid #BAE6FD`, borderLeft: "3px solid #0284C7", borderRadius: 9, padding: "12px 14px", marginBottom: 8, background: "#fff" }}>
                        <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          List {li + 1}{l.name ? ` — ${l.name}` : ""}
                        </p>
                        <Row label="Status flow" value={l.statuses} />
                        {l.custom_fields && (
                          <div style={{ padding: "8px 0", borderBottom: "1px solid #F9FAFB" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Custom fields</span>
                            <pre style={{ margin: 0, fontSize: 12, color: "#374151", fontFamily: "monospace", background: "#F3F4F6", padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{l.custom_fields}</pre>
                          </div>
                        )}
                        {Array.isArray(l.automations) && l.automations.length > 0 && (
                          <div style={{ padding: "8px 0" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Automations</span>
                            {l.automations.map((auto, ai) => (
                              <div key={ai} style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C780", borderRadius: 8, padding: "12px 14px", marginBottom: 8, background: "#F0F9FF" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Automation {ai + 1}</p>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: (auto.platform || "clickup") === "clickup" ? "#0284C7" : "#7C3AED", background: (auto.platform || "clickup") === "clickup" ? "#EEEAF8" : "#F5F3FF", border: `1px solid ${(auto.platform || "clickup") === "clickup" ? "#BAE6FD" : "#DDD6FE"}`, borderRadius: 6, padding: "2px 8px", fontFamily: F }}>
                                    {(auto.platform || "clickup") === "clickup" ? "ClickUp" : (auto.third_party_platform || "3rd Party")}
                                  </span>
                                </div>
                                {auto.triggers?.length > 0 && (
                                  <div style={{ marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Triggers</span>
                                    {auto.triggers.map((t, ti) => t.type && (
                                      <div key={ti} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", fontFamily: F, background: "#EEEAF8", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.type}</span>
                                        {t.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: F }}>{t.detail}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {(auto.platform || "clickup") === "clickup" && auto.actions?.length > 0 && (
                                  <div style={{ marginBottom: auto.instructions ? 8 : 0 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</span>
                                    {auto.actions.map((a, ai2) => a.type && (
                                      <div key={ai2} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: F, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{a.type}</span>
                                        {a.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: F }}>{a.detail}</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {auto.instructions && (
                                  <div style={{ marginTop: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                      {(auto.platform || "clickup") === "clickup" ? "Instructions" : "Actions / Instructions"}
                                    </span>
                                    <pre style={{ margin: "4px 0 0", fontSize: 12, fontFamily: "monospace", background: "#1E1E2E", color: "#E2E8F0", padding: "10px 12px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{auto.instructions}</pre>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CollapsibleCard>
                ))}
              </div>
            )}
            {build?.build_notes && <Row label="Build notes" value={build.build_notes} fullWidth />}
          </Section>
        )}

        {/* Intent vs Reality — Delta */}
        {delta && (delta.user_intent || delta.success_criteria || delta.roadblocks?.length > 0) && (
          <Section title="Intent vs Reality" subtitle="Log the gap between what was wanted and what was delivered" color="#059669">
            <Row label="User intent" value={delta.user_intent} fullWidth />
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

        {/* Decision Reasoning */}
        {reasoning && (reasoning.why_structure || reasoning.alternatives) && (
          <Section title="Decision Reasoning" subtitle="Record the reasoning behind every major decision" color="#059669">
            <Row label="Why this structure" value={reasoning.why_structure} fullWidth />
            <Row label="Alternatives considered" value={reasoning.alternatives} fullWidth />
            <Row label="Why they were rejected" value={reasoning.why_rejected} fullWidth />
            <Row label="Assumptions" value={reasoning.assumptions} fullWidth />
            <Row label="Lessons learned" value={reasoning.lessons} fullWidth />
          </Section>
        )}

        {/* Outcome */}
        {outcome && (outcome.built || outcome.what_worked || outcome.what_failed) && (
          <Section title="Outcome" subtitle="Capture the post-build result and long-term usage signal" color="#059669">
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

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E7EB", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
            This brief was shared with you via <strong style={{ color: "#6B7280" }}>Patternly</strong> · Read-only view
          </p>
        </div>
      </div>

      {/* Workflow map modal */}
      {mapWfIndex !== null && build?.workflows?.[mapWfIndex] && (
        <WorkflowMapPanel
          workflow={build.workflows[mapWfIndex]}
          onClose={() => setMapWfIndex(null)}
          asModal
        />
      )}
    </div>
  );
}
