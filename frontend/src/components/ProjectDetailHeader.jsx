import { Link } from "react-router-dom";
import { formatDate, totalUpdatesDuration } from "@utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const DISPLAY = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

// Trim free text to at most `max` sentences. Sentences end at . ! or ?.
// Falls back to the original string if the text has no sentence punctuation.
function truncateToSentences(text, max) {
  if (!text) return "";
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "." || text[i] === "!" || text[i] === "?") {
      count++;
      if (count >= max) return text.slice(0, i + 1).trim();
    }
  }
  return text.trim();
}

// Fallback palette for public / print pages that don't have the app's theme context.
const LIGHT_THEME = {
  text:       "#1A1A1F",
  textSec:    "#374151",
  textMuted:  "#6B7280",
  textFaint:  "#9CA3AF",
  border:     "#E5E7EB",
  surface:    "#FFFFFF",
};

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

function StatCard({ label, value, sub, warn, theme, last }) {
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

/**
 * Shared project detail header — used on:
 *   - Authenticated detail page (with action buttons)
 *   - Public shared link page (read-only)
 *   - Client brief page (read-only)
 *   - Print / PDF export view
 *
 * Props:
 *   cf           — full case file / project object
 *   theme        — theme object (optional; falls back to light theme for public/print)
 *   backTo       — optional route for "back" link (e.g. "/projects"); omit to hide
 *   backLabel    — label for the back link
 *   actions      — optional JSX slot rendered in the top-right (for action buttons)
 */
export default function ProjectDetailHeader({
  cf,
  theme: themeProp,
  backTo,
  backLabel = "Back to projects",
  actions,
  hideMetrics = [],
}) {
  const theme = themeProp || LIGHT_THEME;
  const hidden = new Set(hideMetrics);

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
  const toolsSub = tools.length > 0
    ? tools.slice(0, 4).join(" · ") + (tools.length > 4 ? ` · +${tools.length - 4}` : "")
    : "None";

  const { label: durationLabel, range: durationRange } =
    computeBuildDuration(cf.created_at, cf.updated_at);

  const updates = cf.project_updates || [];
  const timeSpentLabel = totalUpdatesDuration(updates) || "—";
  const updatesWithTime = updates.filter(u => u.minutes_spent != null && u.minutes_spent > 0).length;
  const timeSpentSub = updatesWithTime > 0
    ? `Across ${pluralize(updatesWithTime, "update", "updates")}`
    : "None logged";

  // Summary lede: prefer intake.raw_prompt → outcome.what_worked → reasoning.why_structure.
  // Cap at 3 sentences so the header stays compact regardless of source length.
  const summary = truncateToSentences(
    cf.intake?.raw_prompt
      || cf.outcome?.what_worked
      || cf.reasoning?.why_structure
      || "",
    3,
  );

  const caseFileLabel = cf.short_id
    || cf.case_number
    || (cf.id ? `#${String(cf.id).slice(0, 8)}` : "");

  return (
    <div style={{ marginBottom: 20, paddingTop: 12 }}>

      {/* Back link (optional) */}
      {backTo && (
        <Link
          to={backTo}
          className="fp-no-print"
          style={{
            fontSize: 12.5, color: theme.textMuted, fontFamily: F, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 4l-4 4 4 4"/>
          </svg>
          {backLabel}
        </Link>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>

        {/* Left: meta + title + lede */}
        <div style={{ flex: "1 1 0", minWidth: 0 }}>

          {/* Meta row */}
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
            marginBottom: 10, fontSize: 12, color: theme.textMuted, fontFamily: F,
          }}>
            <StatusPill status={cf.status} />
            {cf.workflow_type && (
              <><span style={{ color: theme.textFaint }}>·</span><span>{cf.workflow_type}</span></>
            )}
            {cf.logged_by_name && (
              <><span style={{ color: theme.textFaint }}>·</span><span>Logged by {cf.logged_by_name}</span></>
            )}
            {cf.updated_at && (
              <><span style={{ color: theme.textFaint }}>·</span><span>Updated {formatDate(cf.updated_at)}</span></>
            )}
          </div>

          {/* Title */}
          <h1 style={{
            margin: "6px 0 12px", fontSize: 40, fontWeight: 500, fontFamily: DISPLAY,
            color: theme.text, lineHeight: 1.05, letterSpacing: "-0.025em", wordBreak: "break-word",
          }}>
            {cf.name || cf.workflow_type || "Untitled workflow"}
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

        {/* Right: optional action buttons */}
        {actions && (
          <div className="fp-no-print" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {/* Metrics grid — auto-sizes based on hidden set */}
      {(() => {
        const cards = [
          !hidden.has("satisfaction") && { label: "Satisfaction",   value: satValue,       sub: satSub },
          !hidden.has("roadblocks")   && { label: "Roadblocks",     value: roadblocks,     sub: roadblockSub, warn: roadblocks > 0 },
          !hidden.has("tools")        && { label: "Tools in scope", value: toolsValue,     sub: toolsSub },
          !hidden.has("timeSpent")    && { label: "Time spent",     value: timeSpentLabel, sub: timeSpentSub },
          !hidden.has("buildDuration")&& { label: "Build duration", value: durationLabel,  sub: durationRange },
        ].filter(Boolean);
        return (
          <div style={{
            marginTop: 24,
            display: "grid", gridTemplateColumns: `repeat(${cards.length}, 1fr)`,
            border: `1px solid ${theme.border}`, borderRadius: 10,
            background: theme.surface, overflow: "hidden",
          }}>
            {cards.map((c, i) => (
              <StatCard key={c.label} {...c} theme={theme} last={i === cards.length - 1} />
            ))}
          </div>
        );
      })()}
    </div>
  );
}
