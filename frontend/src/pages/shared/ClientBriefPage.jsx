import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicApi from "../../api/publicClient";
import ProjectDetailHeader from "../../components/ProjectDetailHeader";
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
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Patternly
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
    </div>
  );
}
