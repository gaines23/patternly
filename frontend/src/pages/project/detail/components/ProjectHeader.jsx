import { flushSync } from "react-dom";
import ProjectDetailHeader from "@components/ProjectDetailHeader";
import { F, BLUE } from "../constants";

/**
 * Authenticated project detail header.
 *
 * Delegates rendering of the meta row / title / lede / metrics grid to the
 * shared <ProjectDetailHeader>, and passes the action buttons (status toggle,
 * Options dropdown) through the `actions` slot.
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
    document.title = `${name}_${date}_Patternly`;
    flushSync(() => setIsPrinting(true));
    window.onafterprint = () => { document.title = prev; window.onafterprint = null; setIsPrinting(false); };
    window.print();
  };

  const actions = (
    <>
      <button
        onClick={onToggleStatus}
        disabled={statusPending}
        style={{
          padding: "8px 14px",
          background: cf.status === "closed" ? "#E8F1EB" : theme.surface,
          border: `1px solid ${cf.status === "closed" ? "#A7D0B4" : theme.borderInput}`,
          borderRadius: 8,
          color: cf.status === "closed" ? "#204A33" : theme.textSec,
          fontSize: 12.5, fontWeight: 600, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
          opacity: statusPending ? 0.6 : 1,
        }}
      >
        {cf.status === "closed" ? "Reopen" : "Mark closed"}
      </button>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowOptions(o => !o)}
          style={{
            padding: "8px 14px", background: theme.surface,
            border: `1px solid ${theme.borderInput}`, borderRadius: 8,
            color: theme.textSec, fontSize: 12.5, fontWeight: 600, fontFamily: F,
            cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
          }}
        >
          Options <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
        </button>

        {showOptions && (
          <>
            <div onClick={() => setShowOptions(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100, background: theme.surfaceRaised, border: `1px solid ${theme.borderInput}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 170, overflow: "hidden" }}>
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
    </>
  );

  return (
    <ProjectDetailHeader
      cf={cf}
      theme={theme}
      backTo="/projects"
      backLabel="Back to projects"
      actions={actions}
    />
  );
}
