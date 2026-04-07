import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { formatDate } from "@utils/transforms";
import { F, BLUE } from "../constants";

/**
 * Page-level header for the project detail view.
 *
 * Renders:
 *   - Back breadcrumb link
 *   - Title, workflow type, meta row (logged by, date, satisfaction, roadblocks, status badge)
 *   - Action buttons: status toggle, Options dropdown (Edit / Share / Export PDF / Delete)
 *
 * Props:
 *   cf              — project object
 *   theme           — theme object from useTheme()
 *   onEdit          — open edit mode
 *   onShare         — open share modal
 *   onDelete        — delete handler (async, called after Options closes)
 *   onToggleStatus  — mutate status
 *   statusPending   — boolean, disables the status button
 *   deletePending   — boolean, shows "Deleting…"
 *   showOptions     — boolean
 *   setShowOptions  — state setter
 *   setIsPrinting   — needed for PDF export to set printing state before window.print()
 */
export default function ProjectHeader({
  cf,
  theme,
  onEdit,
  onShare,
  onDelete,
  onToggleStatus,
  statusPending,
  deletePending,
  showOptions,
  setShowOptions,
  setIsPrinting,
}) {
  const handleExportPdf = () => {
    setShowOptions(false);
    const name = (cf.name || cf.workflow_type || "Case_File").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const date = new Date().toISOString().slice(0, 10);
    const prev = document.title;
    document.title = `${name}_${date}_Flowpath`;
    flushSync(() => setIsPrinting(true));
    window.onafterprint = () => { document.title = prev; window.onafterprint = null; setIsPrinting(false); };
    window.print();
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>

        {/* Left: title + meta */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>
          <Link
            to="/projects"
            className="fp-no-print"
            style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}
          >
            ← Projects
          </Link>

          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontFamily: "'Fraunces', serif", wordBreak: "break-word" }}>
            {cf.name || cf.workflow_type || "Untitled workflow"}
          </h1>

          {cf.name && cf.workflow_type && (
            <p style={{ margin: "0 0 6px", fontSize: 14, color: theme.textMuted, fontFamily: F }}>{cf.workflow_type}</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: theme.textMuted, fontFamily: F, alignItems: "center" }}>
            <span>Logged by <strong style={{ color: theme.textSec }}>{cf.logged_by_name || "—"}</strong></span>
            <span>·</span>
            <span>{formatDate(cf.created_at)}</span>

            {cf.satisfaction_score && (
              <><span>·</span><span>{cf.satisfaction_score}/5 satisfaction</span></>
            )}

            {cf.roadblock_count > 0 && (
              <><span>·</span><span style={{ color: "#EA580C" }}>{cf.roadblock_count} roadblock{cf.roadblock_count !== 1 ? "s" : ""}</span></>
            )}

            {/* Status badge */}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
              background: cf.status === "closed" ? "#ECFDF5" : "#EFF6FF",
              border: `1px solid ${cf.status === "closed" ? "#6EE7B7" : "#BFDBFE"}`,
              color: cf.status === "closed" ? "#065F46" : "#1D4ED8",
              fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {cf.status === "closed" ? "Closed" : "Open"}
            </span>

            {cf.status === "closed" && cf.closed_at && (
              <span style={{ fontSize: 12, color: theme.textFaint, fontFamily: F }}>
                closed {formatDate(cf.closed_at)}
              </span>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="fp-no-print" style={{ display: "flex", gap: 8, flexShrink: 0, paddingTop: 28 }}>

          {/* Status toggle */}
          <button
            onClick={onToggleStatus}
            disabled={statusPending}
            style={{
              padding: "9px 16px",
              background: cf.status === "closed" ? "#ECFDF5" : theme.surface,
              border: `1.5px solid ${cf.status === "closed" ? "#6EE7B7" : theme.borderInput}`,
              borderRadius: 9,
              color: cf.status === "closed" ? "#065F46" : theme.textSec,
              fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
              opacity: statusPending ? 0.6 : 1,
            }}
          >
            {cf.status === "closed" ? "Reopen" : "Mark closed"}
          </button>

          {/* Options dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowOptions(o => !o)}
              style={{ padding: "9px 16px", background: theme.surface, border: `1.5px solid ${theme.borderInput}`, borderRadius: 9, color: theme.textSec, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
            >
              Options <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </button>

            {showOptions && (
              <>
                <div onClick={() => setShowOptions(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100, background: theme.surface, border: `1px solid ${theme.borderInput}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 170, overflow: "hidden" }}>
                  <button
                    onClick={() => { setShowOptions(false); onEdit(); }}
                    style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${theme.borderSubtle}`, color: theme.text, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { setShowOptions(false); onShare(); }}
                    style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${theme.borderSubtle}`, color: cf.share_enabled ? BLUE : theme.text, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}
                  >
                    {cf.share_enabled ? "🔗 Share link" : "Share link"}
                  </button>
                  <button
                    onClick={handleExportPdf}
                    style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${theme.borderSubtle}`, color: theme.text, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}
                  >
                    Export PDF
                  </button>
                  <button
                    onClick={() => { setShowOptions(false); onDelete(); }}
                    disabled={deletePending}
                    style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", color: "#EF4444", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}
                  >
                    {deletePending ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
