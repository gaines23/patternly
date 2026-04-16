import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicApi from "../../api/publicClient";

const F = "'Plus Jakarta Sans', sans-serif";

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

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Flowpath
        </span>
        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 12px" }}>
          Read-only · Client update
        </span>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: "'Fraunces', serif", color: "#111827" }}>
            {cf.name || cf.workflow_type || "Project Update"}
          </h1>
          {cf.name && cf.workflow_type && (
            <p style={{ margin: "0 0 10px", fontSize: 15, color: "#6B7280", fontFamily: F }}>{cf.workflow_type}</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#6B7280", fontFamily: F }}>
            {cf.logged_by_name && (
              <span>Prepared by <strong style={{ color: "#374151" }}>{cf.logged_by_name}</strong></span>
            )}
          </div>
        </div>

        {/* Industry / tool chips */}
        {(cf.industries?.length > 0 || cf.tools?.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {cf.industries?.map(i => (
              <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#2563EB", fontFamily: F, fontWeight: 500 }}>{i}</span>
            ))}
            {cf.tools?.slice(0, 6).map(t => (
              <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#6B7280", fontFamily: F }}>{t}</span>
            ))}
          </div>
        )}

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

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 32, borderTop: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
            This update was shared with you via <strong style={{ color: "#6B7280" }}>Flowpath</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
