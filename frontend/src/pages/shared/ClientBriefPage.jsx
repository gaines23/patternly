import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicApi from "../../api/publicClient";
import ProjectDetailHeader from "../../components/ProjectDetailHeader";
import { WorkflowMapPanel } from "../../components/WorkflowMapPanel";
import { PatternlyMark } from "../../components/brand/PatternlyMark";
import { formatMinutes, totalUpdatesDuration } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";

function UpdateItem({ pu }) {
  const [open, setOpen] = useState(false);
  const dateLabel = pu.created_at
    ? (() => { const [y, m, d] = pu.created_at.slice(0, 10).split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()
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
        <div style={{ padding: "12px 14px", background: "#fff" }}>
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

function BuildSection({ build, mapWfIndex, onToggleMap }) {
  if (!build) return null;
  const hasSpaces    = !!build.spaces;
  const hasWorkflows = build.workflows?.length > 0;
  const hasNotes     = !!build.build_notes;
  if (!hasSpaces && !hasWorkflows && !hasNotes) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: "#0284C712", borderRadius: "10px 10px 0 0",
        border: "1px solid #0284C740", borderBottom: "1.5px solid #0284C750",
      }}>
        <span style={{ width: 20, height: 20, background: "#0284C7", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>&#9881;</span>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0284C7", fontFamily: F }}>Build</p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: F }}>What was built — workflows, lists, and automations</p>
        </div>
      </div>
      <div style={{
        background: "#fff", border: "1px solid #0284C740", borderTop: "none",
        borderRadius: "0 0 10px 10px", padding: "18px 14px",
      }}>
        {hasSpaces && (
          <div style={{ marginBottom: hasWorkflows || hasNotes ? 16 : 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Spaces</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {build.spaces.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {hasWorkflows && build.workflows.map((wf, wi) => (
          <WorkflowItem
            key={wi}
            wf={wf}
            index={wi}
            mapOpen={mapWfIndex === wi}
            onToggleMap={() => onToggleMap(wi)}
          />
        ))}
        {hasNotes && (
          <div style={{ marginTop: hasWorkflows ? 16 : 0, paddingTop: hasWorkflows ? 12 : 0, borderTop: hasWorkflows ? "1px solid #F3F4F6" : "none" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>Build notes</span>
            <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{build.build_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowItem({ wf, index, mapOpen, onToggleMap }) {
  const [open, setOpen] = useState(false);
  const listCount = wf.lists?.length || 0;
  return (
    <div style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: open ? "1px solid #BAE6FD" : "none", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 6, background: "#0284C7", color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: F, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{index + 1}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{wf.name || `Workflow ${index + 1}`}</span>
        {listCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>{listCount} {listCount === 1 ? "list" : "lists"}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMap(); }}
          style={{
            marginLeft: "auto",
            fontSize: 11, fontWeight: 600, fontFamily: F,
            color: mapOpen ? "#fff" : "#0284C7",
            background: mapOpen ? "#0284C7" : "#E0F2FE",
            border: "1px solid #BAE6FD",
            borderRadius: 6, padding: "3px 10px",
            cursor: "pointer", lineHeight: 1.4,
          }}
        >
          {mapOpen ? "✕ Map" : "Map ↗"}
        </button>
        <span style={{ fontSize: 14, color: "#0284C7", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: "12px 14px", background: "#fff" }}>
          {wf.notes && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6, fontStyle: "italic" }}>{wf.notes}</p>}
          {wf.lists?.map((l, li) => <ListItem key={li} list={l} index={li} />)}
        </div>
      )}
    </div>
  );
}

function ListItem({ list, index }) {
  const statusChips = list.statuses ? list.statuses.split(/→|,/).map(s => s.trim()).filter(Boolean) : [];
  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 9, padding: "10px 12px", marginBottom: 8, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          List {index + 1}{list.name ? ` — ${list.name}` : ""}
        </p>
        {list.space && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", fontFamily: F }}>{list.space}</span>
        )}
      </div>
      {statusChips.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Status flow</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            {statusChips.map((s, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0369A1", background: "#fff", border: "1px solid #BAE6FD", borderRadius: 5, padding: "1px 7px", fontFamily: F }}>{s}</span>
                {i < statusChips.length - 1 && <span style={{ fontSize: 10, color: "#B8B0D9" }}>›</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {list.custom_fields && (
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Custom fields</span>
          <pre style={{ margin: 0, fontSize: 12, color: "#374151", fontFamily: "monospace", background: "#F3F4F6", padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{list.custom_fields}</pre>
        </div>
      )}
      {Array.isArray(list.automations) && list.automations.length > 0 && (
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Automations</span>
          {list.automations.map((auto, ai) => <AutomationItem key={ai} auto={auto} index={ai} />)}
        </div>
      )}
    </div>
  );
}

function AutomationItem({ auto, index }) {
  const isThirdParty = (auto.platform || "clickup") === "third_party";
  const platformLabel = isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp";
  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: `3px solid ${isThirdParty ? "#7C3AED" : "#0284C7"}80`, borderRadius: 8, padding: "10px 12px", marginBottom: 6, background: "#F0F9FF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Automation {index + 1}</p>
        <span style={{ fontSize: 11, fontWeight: 600, color: isThirdParty ? "#7C3AED" : "#0284C7", background: isThirdParty ? "#F5F3FF" : "#EEEAF8", border: `1px solid ${isThirdParty ? "#DDD6FE" : "#BAE6FD"}`, borderRadius: 6, padding: "2px 8px", fontFamily: F }}>{platformLabel}</span>
      </div>
      {auto.triggers?.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>When</span>
          {auto.triggers.map((t, ti) => t.type && (
            <div key={ti} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", fontFamily: F, background: "#EEEAF8", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.type}</span>
              {t.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: F }}>{t.detail}</span>}
            </div>
          ))}
        </div>
      )}
      {!isThirdParty && auto.actions?.length > 0 && (
        <div style={{ marginBottom: auto.instructions ? 6 : 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Then</span>
          {auto.actions.map((a, ai2) => a.type && (
            <div key={ai2} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: F, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{a.type}</span>
              {a.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: F }}>{a.detail}</span>}
            </div>
          ))}
        </div>
      )}
      {auto.map_description && (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#374151", fontFamily: F, lineHeight: 1.6 }}>{auto.map_description}</p>
      )}
    </div>
  );
}

function SummaryText({ text }) {
  if (!text) return null;
  return text.split("\n").map((line, li) => {
    const trimmed = line.trim();
    if (trimmed === "") return <div key={li} style={{ height: 8 }} />;
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      return <p key={li} style={{ margin: "16px 0 6px", fontSize: 15, fontWeight: 700, color: "#1F2937", fontFamily: F }}>{boldMatch[1]}</p>;
    }
    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    const rendered = parts.map((part, pi) => {
      const m = part.match(/^\*\*(.*?)\*\*$/);
      if (m) return <strong key={pi}>{m[1]}</strong>;
      return <span key={pi}>{part}</span>;
    });
    return <p key={li} style={{ margin: "3px 0", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7 }}>{rendered}</p>;
  });
}

export default function ClientBriefPage() {
  const { shareToken } = useParams();
  const [mapWfIndex, setMapWfIndex] = useState(null);

  const { data: cf, isLoading, isError, error } = useQuery({
    queryKey: ["clientBrief", shareToken],
    queryFn: async () => {
      const { data } = await publicApi.get(`/v1/briefs/client/${shareToken}/`);
      return data;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, color: "#9CA3AF" }}>
        Loading...
      </div>
    );
  }

  if (isError) {
    const msg = error?.response?.data?.detail || "This link is invalid or has been disabled.";
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>&#128274;</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Link unavailable</p>
          <p style={{ fontSize: 14, color: "#6B7280" }}>{msg}</p>
        </div>
      </div>
    );
  }

  const hasNoSummary = !cf.updates_summary;
  const updates = cf.project_updates || [];
  const totalDuration = totalUpdatesDuration(updates);

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Top bar */}
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
          Read-only · Client update
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 32px 80px" }}>
        {/* Header (shared component) */}
        <ProjectDetailHeader cf={cf} hideMetrics={["satisfaction"]} />

        {/* Progress Overview */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: "#6366F112", borderRadius: "10px 10px 0 0",
            border: "1px solid #6366F140", borderBottom: "1.5px solid #6366F150",
          }}>
            <span style={{ width: 20, height: 20, background: "#6366F1", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#6366F1", fontFamily: F }}>Progress Overview</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: F }}>Project updates and scope change summary</p>
            </div>
          </div>
          <div style={{
            background: "#fff", border: "1px solid #6366F140", borderTop: "none",
            borderRadius: "0 0 10px 10px", padding: "20px 18px",
          }}>
            {hasNoSummary ? (
              <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", fontFamily: F, fontStyle: "italic" }}>
                No progress summary has been generated yet.
              </p>
            ) : (
              <div style={{ fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.8 }}>
                <SummaryText text={cf.updates_summary} />
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        {cf.updates_summary_generated_at && (
          <p style={{ fontSize: 11, color: "#9CA3AF", fontFamily: F, textAlign: "center", margin: "0 0 32px" }}>
            Summary generated {new Date(cf.updates_summary_generated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}

        {/* Build */}
        <BuildSection
          build={cf.build}
          mapWfIndex={mapWfIndex}
          onToggleMap={(wi) => setMapWfIndex(prev => prev === wi ? null : wi)}
        />

        {/* Project Updates */}
        {updates.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              background: "#0284C712", borderRadius: "10px 10px 0 0",
              border: "1px solid #0284C740", borderBottom: "1.5px solid #0284C750",
            }}>
              <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0284C7", fontFamily: F }}>Project Updates</p>
                {totalDuration && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: F }}>Total time spent: {totalDuration}</p>}
              </div>
            </div>
            <div style={{
              background: "#fff", border: "1px solid #0284C740", borderTop: "none",
              borderRadius: "0 0 10px 10px", padding: "18px 14px",
            }}>
              {[...updates]
                .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
                .map((pu, i) => <UpdateItem key={pu.id || i} pu={pu} />)
              }
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 32, borderTop: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
            This update was shared with you via <strong style={{ color: "#6B7280" }}>Patternly</strong>
          </p>
        </div>
      </div>

      {/* Workflow map modal */}
      {mapWfIndex !== null && cf.build?.workflows?.[mapWfIndex] && (
        <WorkflowMapPanel
          workflow={cf.build.workflows[mapWfIndex]}
          onClose={() => setMapWfIndex(null)}
          asModal
        />
      )}
    </div>
  );
}
