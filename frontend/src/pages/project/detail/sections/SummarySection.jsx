import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { useProjectSummary } from "@hooks/useProjects";
import Section from "../components/Section";
import { F } from "../constants";

/**
 * Renders summary text with inline workflow map PDF buttons next to workflow names.
 */
function SummaryRenderer({ text, workflows = [], onOpenMap, summaryType }) {
  if (summaryType !== "full" || !workflows?.length || !onOpenMap) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
  }

  // Split text into lines and inject map buttons after workflow name lines
  const lines = text.split("\n");

  return lines.map((line, li) => {
    // Detect bold workflow name lines like "**Workflow Name**"
    const boldMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      const name = boldMatch[1].trim();
      // Find matching workflow index
      const wfIdx = workflows.findIndex(
        (wf) => wf.name && name.toLowerCase().includes(wf.name.toLowerCase())
      );

      return (
        <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: li > 0 ? 10 : 0, marginBottom: 2 }}>
          <span style={{ fontWeight: 700 }}>{name}</span>
          {wfIdx !== -1 && (
            <button
              onClick={() => onOpenMap(wfIdx)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                background: "#EEF2FF", border: "1px solid #C7D2FE",
                color: "#4F46E5", fontSize: 11, fontWeight: 600, fontFamily: F,
                transition: "all 0.15s", flexShrink: 0,
              }}
            >
              &#8599; View Map / PDF
            </button>
          )}
        </div>
      );
    }

    // Render bold inline markers like **Section Title**
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const rendered = parts.map((part, pi) => {
      const inlineMatch = part.match(/^\*\*(.*?)\*\*$/);
      if (inlineMatch) return <strong key={pi}>{inlineMatch[1]}</strong>;
      return <span key={pi}>{part}</span>;
    });

    return <div key={li} style={{ minHeight: line.trim() === "" ? 10 : undefined }}>{rendered}</div>;
  });
}

/**
 * AI-powered project summary section.
 *
 * Props:
 *   caseFileId  — UUID of the case file
 *   summaryType — "full" (build notes + updates + scope creep) or "updates" (updates + scope creep only)
 *   title       — section heading
 *   subtitle    — section subheading
 *   color       — accent color
 */
export default function SummarySection({
  caseFileId,
  summaryType = "full",
  title = "Full Project Summary",
  subtitle = "AI-generated summary of the full project for reporting",
  color = "#6366F1",
  embedded = false,
  workflows = [],
  onOpenMap,
}) {
  const { theme } = useTheme();
  const [mode, setMode] = useState("all"); // "all" | "range"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [triggerFetch, setTriggerFetch] = useState(false);

  // Build query params based on mode
  const queryDates =
    mode === "range"
      ? { startDate, endDate }
      : { startDate: undefined, endDate: undefined };

  const { data, isLoading, isError, error } = useProjectSummary(caseFileId, {
    summaryType,
    ...queryDates,
    enabled: triggerFetch,
  });

  const handleGenerate = () => {
    setTriggerFetch(false);
    // Brief delay to reset the query, then re-enable
    setTimeout(() => setTriggerFetch(true), 50);
  };

  const inputStyle = {
    padding: "8px 12px",
    border: `1px solid ${theme.borderInput || theme.border}`,
    borderRadius: 8,
    fontSize: 13,
    fontFamily: F,
    color: theme.text,
    background: theme.surface,
    outline: "none",
    width: 150,
  };

  const btnBase = {
    padding: "8px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: F,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
  };

  const content = (
    <>
      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}`, width: "fit-content" }}>
        <button
          onClick={() => { setMode("all"); setTriggerFetch(false); }}
          style={{
            ...btnBase,
            border: "none",
            borderRadius: 0,
            background: mode === "all" ? color : theme.surface,
            color: mode === "all" ? "#fff" : theme.textSec,
          }}
        >
          Full Summary
        </button>
        <button
          onClick={() => { setMode("range"); setTriggerFetch(false); }}
          style={{
            ...btnBase,
            border: "none",
            borderRadius: 0,
            borderLeft: `1px solid ${theme.border}`,
            background: mode === "range" ? color : theme.surface,
            color: mode === "range" ? "#fff" : theme.textSec,
          }}
        >
          Date Range
        </button>
      </div>

      {/* Date inputs (only for range mode) */}
      {mode === "range" && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setTriggerFetch(false); }}
              style={inputStyle}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setTriggerFetch(false); }}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || (mode === "range" && !startDate && !endDate)}
        style={{
          ...btnBase,
          background: isLoading ? theme.border : color,
          color: "#fff",
          opacity: isLoading || (mode === "range" && !startDate && !endDate) ? 0.5 : 1,
          marginBottom: 20,
        }}
      >
        {isLoading ? "Generating..." : "Generate Summary"}
      </button>

      {/* Error state */}
      {isError && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontFamily: F }}>
            {error?.response?.data?.detail || "Failed to generate summary. Please try again."}
          </p>
        </div>
      )}

      {/* Summary result */}
      {data && !isLoading && (
        <div>
          {/* Meta bar */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            {data.date_range?.start && (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#4F46E5", fontFamily: F, fontWeight: 600 }}>
                {data.date_range.start} to {data.date_range.end || "present"}
              </span>
            )}
            {!data.date_range?.start && (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#4F46E5", fontFamily: F, fontWeight: 600 }}>
                All time
              </span>
            )}
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: theme.surfaceAlt || "#F9FAFB", border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
              {data.data_counts?.project_updates || 0} updates
            </span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: theme.surfaceAlt || "#F9FAFB", border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
              {data.data_counts?.scope_creep_items || 0} scope creep items
            </span>
          </div>

          {/* Summary text with inline workflow map buttons */}
          <div style={{
            padding: "18px 20px",
            background: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 12,
            fontSize: 13,
            color: theme.text,
            fontFamily: F,
            lineHeight: 1.8,
          }}>
            <SummaryRenderer
              text={data.summary}
              workflows={workflows}
              onOpenMap={onOpenMap}
              summaryType={summaryType}
            />
          </div>

          {/* Copy button */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => navigator.clipboard.writeText(data.summary)}
              style={{
                ...btnBase,
                background: "transparent",
                color: theme.textSec,
                border: `1px solid ${theme.border}`,
                fontSize: 12,
              }}
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {/* Empty state before first generation */}
      {!data && !isLoading && !isError && (
        <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic", margin: 0 }}>
          Click "Generate Summary" to create an AI-powered summary for reporting.
        </p>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <Section title={title} subtitle={subtitle} color={color} filled={false}>
      {content}
    </Section>
  );
}
