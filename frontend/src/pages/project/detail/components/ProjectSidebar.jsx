import { useState } from "react";
import { F } from "../constants";
import DetailRow from "./DetailRow";
import { formatMinutes, totalUpdatesDuration } from "@utils/transforms";

function UpdateItem({ pu, theme }) {
  const [open, setOpen] = useState(false);
  const dateLabel = pu.created_at
    ? (() => { const [y, m, d] = pu.created_at.slice(0, 10).split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()
    : "—";
  const durationLabel = formatMinutes(pu.minutes_spent);
  return (
    <div style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#0284C712", borderBottom: open ? "1px solid #BAE6FD" : "none", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
        {pu.created_by_name && (
          <span style={{ fontSize: 11, color: "#0284C7", opacity: 0.75, fontFamily: F }}>
            by {pu.created_by_name}
          </span>
        )}
        {durationLabel && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>
            ⏱ {durationLabel}
          </span>
        )}
        {pu.attachments?.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>
            📎 {pu.attachments.length}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 14, color: "#0284C7", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: "12px 14px", background: theme.surface }}>
          {pu.content && (
            <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>
          )}
          {pu.attachments?.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {pu.attachments.map((att, ai) => att.url && (
                <a
                  key={ai}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "4px 12px", fontFamily: F, fontWeight: 500, textDecoration: "none" }}
                >
                  {att.name || att.url}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Right-hand sticky sidebar shown on wide screens (>= 1300px).
 *
 * Renders two cards:
 *   1. Project Updates — timestamped notes with optional file attachments
 *   2. Scope Creep — unplanned additions to the build
 *
 * Props:
 *   cf    — project object (needs cf.project_updates and cf.delta.scope_creep)
 *   theme — theme object from useTheme()
 */
export default function ProjectSidebar({ cf, theme }) {
  const { project_updates, delta } = cf;
  const totalDuration = totalUpdatesDuration(project_updates);

  return (
    <>
      {/* Project Updates */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "16px 16px 12px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>Project Updates</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Timestamped notes & attachments</p>
          </div>
          {totalDuration && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F, flexShrink: 0 }}>
              ⏱ {totalDuration}
            </span>
          )}
        </div>

        {!project_updates?.length
          ? <p style={{ fontSize: 12, color: theme.borderInput, fontFamily: F, textAlign: "center", padding: "12px 0", margin: 0 }}>No updates logged</p>
          : [...project_updates]
              .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
              .map((pu, i) => <UpdateItem key={pu.id || i} pu={pu} theme={theme} />)
        }
      </div>

      {/* Scope Creep */}
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "16px 16px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>Scope Creep</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Unplanned additions to the build</p>
        </div>

        {!delta?.scope_creep?.length
          ? <p style={{ fontSize: 12, color: theme.borderInput, fontFamily: F, textAlign: "center", padding: "12px 0", margin: 0 }}>No scope creep logged</p>
          : delta.scope_creep.map((sc, i) => (
              <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#D9770612" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#D97706", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
                {sc.reason && <DetailRow label="Why added" value={sc.reason} fullWidth />}
                {sc.impact && <DetailRow label="Impact" value={sc.impact} fullWidth />}
                {sc.communicated != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: F,
                      color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                      background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                      border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                      borderRadius: 8, padding: "2px 10px",
                    }}>
                      {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                    </span>
                  </div>
                )}
              </div>
            ))
        }
      </div>
    </>
  );
}
