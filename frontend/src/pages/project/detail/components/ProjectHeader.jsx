import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { formatDate } from "@utils/transforms";
import { F, BLUE } from "../constants";

const DISPLAY = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

/**
 * Page-level header for the project detail view.
 *
 * Renders:
 *   - Back breadcrumb link
 *   - Meta row: status pill · case file # · logged by · updated date
 *   - Title (display) + summary lede
 *   - 4-up metrics grid (satisfaction / roadblocks / tools / build duration)
 *   - Action buttons: status toggle, Options dropdown (Edit / Share / Export PDF / Delete)
 */
function StatusPill({ status }) {
  const isOpen = status !== "closed";
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
      background: isOpen ? "#EEEBFB" : "#E8F1EB",
      color: isOpen ? "#3B2F9C" : "#204A33",
      fontFamily: MONO, textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap",
    }}>
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

function StatCard({ label, value, sub, warn, theme, first, last }) {
  return (
    <div style={{
      padding: "18px 22px",
      borderRight: last ? "none" : `1px solid ${theme.border}`,
    }}>
      <p style={{
        margin: 0, fontSize: 10.5, fontWeight: 600, color: theme.textMuted,
        fontFamily: F, textTransform: "uppercase", letterSpacing: "0.12em",
      }}>
        {label}
      </p>
      <p style={{
        margin: "4px 0 2px", fontSize: 26, fontWeight: 500, fontFamily: DISPLAY,
        color: warn ? "#B47A2B" : theme.text, letterSpacing: "-0.02em", lineHeight: 1.1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ margin: 0, fontSize: 11.5, color: theme.textMuted, fontFamily: F }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function computeBuildDuration(createdAt, updatedAt) {
  if (!createdAt || !updatedAt) return { label: "—", range: null };
  const start = new Date(createdAt);
  const end = new Date(updatedAt);
  const diffMs = end - start;
  const diffDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  let label;
  if (diffDays === 0) label = "< 1 day";
  else if (diffDays < 7) label = `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
  else label = `${Math.round(diffDays / 7)} wk`;

  const fmt = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const range = diffDays === 0 ? fmt(start) : `${fmt(start)} → ${fmt(end)}`;
  return { label, range };
}

function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

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

  // Derive stat values
  const hasSat = cf.satisfaction_score != null;
  const satValue = hasSat ? `${Number(cf.satisfaction_score).toFixed(1)} / 5` : "—";
  const satSub = cf.logged_by_name ? `Logged by ${cf.logged_by_name}` : "Across all outcomes";

  const roadblocks = cf.roadblock_count || 0;
  const totalHoursLost = (cf.delta?.roadblocks || []).reduce(
    (sum, r) => sum + (Number(r.time_cost_hours) || 0), 0
  );
  const roadblockSub = roadblocks === 0
    ? "None logged"
    : totalHoursLost > 0
      ? `~ ${totalHoursLost.toFixed(totalHoursLost % 1 === 0 ? 0 : 1)}h lost during build`
      : pluralize(roadblocks, "roadblock flagged", "roadblocks flagged");

  const tools = cf.tools || [];
  const toolsValue = tools.length;
  const toolsSub = tools.length > 0 ? tools.slice(0, 4).join(" · ") + (tools.length > 4 ? ` · +${tools.length - 4}` : "") : "None";

  const { label: durationLabel, range: durationRange } = computeBuildDuration(cf.created_at, cf.updated_at);

  // Summary: prefer intake.raw_prompt, else fall back to outcome.what_worked or a derived description
  const summary = cf.intake?.raw_prompt
    || cf.outcome?.what_worked
    || cf.reasoning?.why_structure
    || "";

  // Generate a display "case file #" (using created timestamp tail or fallback to short id)
  const caseFileLabel = cf.short_id || cf.case_number || (cf.id ? `#${String(cf.id).slice(0, 8)}` : "");

  return (
    <div style={{ marginBottom: 20, paddingTop: 12 }}>

      {/* Back link */}
      <Link
        to="/projects"
        className="fp-no-print"
        style={{
          fontSize: 12.5, color: theme.textMuted, fontFamily: F, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 4l-4 4 4 4"/>
        </svg>
        Back to projects
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>

        {/* Left: meta + title + lede */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>

          {/* Meta row */}
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
            marginBottom: 10, fontSize: 12, color: theme.textMuted, fontFamily: F,
          }}>
            <StatusPill status={cf.status} />
            {cf.workflow_type && <><span style={{ color: theme.textFaint }}>·</span><span>{cf.workflow_type}</span></>}
            {cf.logged_by_name && <><span style={{ color: theme.textFaint }}>·</span><span>Logged by {cf.logged_by_name}</span></>}
            {cf.updated_at && <><span style={{ color: theme.textFaint }}>·</span><span>Updated {formatDate(cf.updated_at)}</span></>}
          </div>

          {/* Title */}
          <h1 style={{
            margin: "6px 0 12px", fontSize: 40, fontWeight: 500, fontFamily: DISPLAY,
            color: theme.text, lineHeight: 1.05, letterSpacing: "-0.025em", wordBreak: "break-word",
          }}>
            {cf.name || cf.workflow_type || "Untitled workflow"}
            {/* {cf.name && cf.workflow_type && (
              <span style={{ color: theme.textMuted, fontWeight: 400 }}></span>
            )} */}
          </h1>

          {/* Summary / lede */}
          {summary && (
            <p style={{
              margin: 0, fontSize: 15, color: theme.textSec, fontFamily: F,
              lineHeight: 1.55, maxWidth: "62ch",
            }}>
              {summary}
            </p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="fp-no-print" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
        </div>
      </div>

      {/* 4-up metrics grid */}
      <div className="fp-no-print" style={{
        marginTop: 24,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        border: `1px solid ${theme.border}`, borderRadius: 10,
        background: theme.surface, overflow: "hidden",
      }}>
        <StatCard
          label="Satisfaction"
          value={satValue}
          sub={satSub}
          theme={theme}
        />
        <StatCard
          label="Roadblocks"
          value={roadblocks}
          sub={roadblockSub}
          warn={roadblocks > 0}
          theme={theme}
        />
        <StatCard
          label="Tools in scope"
          value={toolsValue}
          sub={toolsSub}
          theme={theme}
        />
        <StatCard
          label="Build duration"
          value={durationLabel}
          sub={durationRange}
          theme={theme}
          last
        />
      </div>
    </div>
  );
}
