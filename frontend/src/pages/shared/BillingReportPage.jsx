import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import publicApi from "../../api/publicClient";
import { formatMinutes } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const ACCENT = "#0284C7";
const ACCENT_BG = "#F0F9FF";
const ACCENT_BORDER = "#BAE6FD";
const ACCENT_PILL_BG = "#E0F2FE";

function formatDateLabel(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function NoteCard({ pu }) {
  const [open, setOpen] = useState(false);
  const dateLabel = formatDateLabel(pu.created_at);
  const durationLabel = formatMinutes(pu.minutes_spent);
  return (
    <div style={{ border: `1.5px solid ${ACCENT_BORDER}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: ACCENT_BG, borderBottom: open ? `1px solid ${ACCENT_BORDER}` : "none",
          cursor: "pointer", userSelect: "none",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, fontFamily: F }}>{dateLabel}</span>
        {durationLabel && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_PILL_BG,
            border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "2px 8px", fontFamily: F,
          }}>
            ⏱ {durationLabel}
          </span>
        )}
        {pu.attachments?.length > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_PILL_BG,
            border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "2px 8px", fontFamily: F,
          }}>
            📎 {pu.attachments.length}
          </span>
        )}
        <span style={{
          marginLeft: "auto", fontSize: 14, color: ACCENT, display: "inline-block",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s",
        }}>
          ▾
        </span>
      </div>
      {open && (
        <div style={{ padding: "12px 14px", background: "#fff" }}>
          {pu.content && (
            <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {pu.content}
            </p>
          )}
          {pu.attachments?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pu.attachments.map((att, ai) => att.url && (
                <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: 12, color: ACCENT, background: ACCENT_PILL_BG,
                  border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "3px 10px",
                  fontFamily: F, fontWeight: 500, textDecoration: "none",
                }}>
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

function ClientSection({ client }) {
  const totalLabel = formatMinutes(client.total_minutes);
  const sorted = [...client.updates].sort(
    (a, b) => (b.created_at || "").localeCompare(a.created_at || ""),
  );
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 14px",
        background: `${ACCENT}12`,
        borderRadius: "10px 10px 0 0",
        border: `1px solid ${ACCENT}40`,
        borderBottom: `1.5px solid ${ACCENT}50`,
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: ACCENT, fontFamily: F }}>
            {client.case_file_name}
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: F }}>
            {client.updates.length} note{client.updates.length !== 1 ? "s" : ""}
          </p>
        </div>
        {totalLabel && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_PILL_BG,
            border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "3px 10px", fontFamily: F,
          }}>
            ⏱ Total: {totalLabel}
          </span>
        )}
      </div>
      <div style={{
        background: "#fff", border: `1px solid ${ACCENT}40`, borderTop: "none",
        borderRadius: "0 0 10px 10px", padding: "14px",
      }}>
        {sorted.map(pu => <NoteCard key={pu.id} pu={pu} />)}
      </div>
    </div>
  );
}

export default function BillingReportPage() {
  const { shareToken } = useParams();
  const [searchParams] = useSearchParams();
  const dateFrom = searchParams.get("from") || "";
  const dateTo   = searchParams.get("to")   || "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["billingReport", shareToken, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo)   params.set("date_to",   dateTo);
      const { data } = await publicApi.get(
        `/v1/briefs/billing/shared/${shareToken}/?${params}`,
      );
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

  const totalLabel = formatMinutes(data.total_minutes ?? 0) || "0min";
  const clients = data.clients || [];
  const dateRangeLabel = (data.date_from || data.date_to)
    ? `${formatDateLabel(data.date_from)} – ${formatDateLabel(data.date_to)}`
    : "All time";

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC" }}>
      {/* Top bar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {data.team_logo_url ? (
          <img src={data.team_logo_url} alt="" style={{ height: 32, maxWidth: 240, objectFit: "contain", display: "block" }} />
        ) : (
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Patternly
          </span>
        )}
        <span style={{
          fontSize: 12, color: "#9CA3AF", fontFamily: F,
          background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 12px",
        }}>
          Read-only · Billing report
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 32px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.14em" }}>
            Billing report
          </p>
          <h1 style={{ margin: "0 0 6px", fontSize: 32, fontWeight: 500, color: "#1F2937", fontFamily: F, letterSpacing: "-0.025em", lineHeight: 1.15 }}>
            {data.owner_name}
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6B7280", fontFamily: F }}>
            {dateRangeLabel}
          </p>
        </div>

        {/* Summary card */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
          padding: "18px 22px", marginBottom: 28,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9CA3AF", fontWeight: 600, fontFamily: F }}>
              Total hours
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 500, fontFamily: F, color: ACCENT, letterSpacing: "-0.02em" }}>
              {totalLabel}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9CA3AF", fontWeight: 600, fontFamily: F }}>
              Clients
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 500, fontFamily: F, color: "#1F2937", letterSpacing: "-0.02em" }}>
              {clients.length}
            </p>
          </div>
        </div>

        {/* Per-client breakdown */}
        {clients.length === 0 ? (
          <div style={{
            padding: "60px 20px", textAlign: "center",
            background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14,
          }}>
            <p style={{ fontSize: 16, color: "#6B7280", fontFamily: F }}>
              No hours or notes logged in this timeframe.
            </p>
          </div>
        ) : (
          clients.map(c => <ClientSection key={c.case_file_id} client={c} />)
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 32, borderTop: "1px solid #E5E7EB", marginTop: 24 }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
            Shared via <strong style={{ color: "#6B7280" }}>Patternly</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
