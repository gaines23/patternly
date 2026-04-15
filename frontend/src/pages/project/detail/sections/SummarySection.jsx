import { useState, useRef, useCallback } from "react";
import { useTheme } from "@hooks/useTheme";
import { useProjectSummary } from "@hooks/useProjects";
import { WorkflowMapPanel } from "@components/WorkflowMapPanel";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import Section from "../components/Section";
import { F } from "../constants";

// ── PDF export helpers ──────────────────────────────────────────────────────

const M = 40;          // margin
const FONT = "helvetica";
const COLOR_HEADING = [99, 102, 241];   // indigo
const COLOR_SECTION = [31, 41, 55];     // near-black bold
const COLOR_BODY = [55, 65, 81];        // body text
const COLOR_MUTED = [107, 114, 128];    // gray
const COLOR_BLUE = [2, 132, 199];       // blue for map titles
const COLOR_FOOTER = [156, 163, 175];

/**
 * Replace unicode characters jsPDF can't render with ASCII equivalents.
 */
function sanitizeForPdf(text) {
  return text
    .replace(/\u2192/g, "->")    // →
    .replace(/\u2019/g, "'")     // '
    .replace(/\u2018/g, "'")     // '
    .replace(/\u201C/g, '"')     // "
    .replace(/\u201D/g, '"')     // "
    .replace(/\u2014/g, " -- ")  // —
    .replace(/\u2013/g, " - ")   // –
    .replace(/\u2026/g, "...")   // …
    .replace(/[^\x00-\x7F]/g, ""); // strip any remaining non-ASCII
}

/**
 * Render structured summary text to PDF pages with proper formatting.
 */
function renderSummaryToPdf(pdf, rawText, startY, pageW, pageH) {
  const maxW = pageW - M * 2;
  let y = startY;

  const newPage = () => { pdf.addPage(); y = M; };
  const ensureSpace = (needed) => { if (y + needed > pageH - M - 20) newPage(); };

  const lines = rawText.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip --- separators
    if (/^-{2,}$/.test(trimmed)) {
      // Draw a thin rule instead
      ensureSpace(16);
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.5);
      pdf.line(M, y, pageW - M, y);
      y += 12;
      continue;
    }

    // Skip empty lines — add small spacing
    if (trimmed === "") {
      y += 6;
      continue;
    }

    const clean = sanitizeForPdf(trimmed.replace(/\*\*/g, ""));
    const isBoldLine = trimmed.startsWith("**") && trimmed.endsWith("**");
    const hasInlineBold = trimmed.includes("**") && !isBoldLine;

    // Section titles (standalone bold lines like "**Overview**", "**Build Summary**")
    if (isBoldLine) {
      // Detect if this is a top-level section vs a workflow/date subheader
      const sectionNames = ["Overview", "Build Summary", "Key Updates", "Scope Changes",
        "Risks & Concerns", "Progress Overview", "Action Items & Concerns"];
      const isTopSection = sectionNames.some(s => clean.toLowerCase().includes(s.toLowerCase()));

      if (isTopSection) {
        ensureSpace(32);
        y += 10;
        pdf.setFont(FONT, "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(...COLOR_SECTION);
        pdf.text(clean, M, y);
        y += 20;
      } else {
        // Workflow name or date subheader
        ensureSpace(24);
        y += 6;
        pdf.setFont(FONT, "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(...COLOR_SECTION);
        pdf.text(clean, M, y);
        y += 16;
      }
      continue;
    }

    // Lines with inline bold (e.g. "Description: ..." after a bold label)
    if (hasInlineBold) {
      ensureSpace(18);
      // Split into bold/normal segments
      const segments = trimmed.split(/(\*\*.*?\*\*)/g);
      let x = M;
      for (const seg of segments) {
        const boldMatch = seg.match(/^\*\*(.*?)\*\*$/);
        const txt = sanitizeForPdf(boldMatch ? boldMatch[1] : seg);
        if (!txt) continue;
        if (boldMatch) {
          pdf.setFont(FONT, "bold");
        } else {
          pdf.setFont(FONT, "normal");
        }
        pdf.setFontSize(10);
        pdf.setTextColor(...COLOR_BODY);
        // If it would overflow, wrap to next line
        const segW = pdf.getTextWidth(txt);
        if (x + segW > pageW - M && x > M) {
          y += 14;
          ensureSpace(16);
          x = M;
        }
        pdf.text(txt, x, y);
        x += segW;
      }
      y += 14;
      continue;
    }

    // Bullet points
    const isBullet = trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed);

    pdf.setFont(FONT, "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...COLOR_BODY);

    const indent = isBullet ? 12 : 0;
    const wrapped = pdf.splitTextToSize(clean, maxW - indent);
    for (let wi = 0; wi < wrapped.length; wi++) {
      ensureSpace(14);
      pdf.text(wrapped[wi], M + indent, y);
      y += 14;
    }
  }

  return y;
}

// ── Inline summary renderer (for on-screen display) ─────────────────────────

function SummaryRenderer({ text, workflows = [], onOpenMap, summaryType }) {
  if (summaryType !== "full" || !workflows?.length || !onOpenMap) {
    return <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>;
  }

  const lines = text.split("\n");

  return lines.map((line, li) => {
    const boldMatch = line.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      const name = boldMatch[1].trim();
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

    const parts = line.split(/(\*\*.*?\*\*)/g);
    const rendered = parts.map((part, pi) => {
      const inlineMatch = part.match(/^\*\*(.*?)\*\*$/);
      if (inlineMatch) return <strong key={pi}>{inlineMatch[1]}</strong>;
      return <span key={pi}>{part}</span>;
    });

    return <div key={li} style={{ minHeight: line.trim() === "" ? 10 : undefined }}>{rendered}</div>;
  });
}

// ── Offscreen map capture ───────────────────────────────────────────────────

function OffscreenMapCapture({ workflow, onCaptured }) {
  const captured = useRef(false);

  const handleRef = useCallback((el) => {
    if (!el || captured.current) return;
    captured.current = true;
    // Wait for ReactFlow to fully render and fit view
    setTimeout(() => {
      toPng(el, { backgroundColor: "#ffffff", pixelRatio: 2, skipFonts: true })
        .then((dataUrl) => onCaptured(dataUrl))
        .catch(() => onCaptured(null));
    }, 1500);
  }, [onCaptured]);

  // Render offscreen but still in layout flow so ReactFlow can measure
  return (
    <div style={{
      position: "fixed", top: 0, left: 0,
      width: 900, height: 700,
      opacity: 0, pointerEvents: "none", zIndex: -1,
      overflow: "hidden",
    }}>
      <div ref={handleRef} style={{ width: 900, height: 700, background: "#fff" }}>
        <WorkflowMapPanel workflow={workflow} onClose={() => {}} />
      </div>
    </div>
  );
}

// ── Main section component ──────────────────────────────────────────────────

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
  const [mode, setMode] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [triggerFetch, setTriggerFetch] = useState(false);

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);
  const [captureQueue, setCaptureQueue] = useState(null);

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
    setTimeout(() => setTriggerFetch(true), 50);
  };

  // ── PDF Export ────────────────────────────────────────────────────────────

  const buildAndDownloadPdf = useCallback((summaryText, maps) => {
    const pageW = 595;
    const pageH = 842;
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // Header
    pdf.setFont(FONT, "bold");
    pdf.setFontSize(20);
    pdf.setTextColor(...COLOR_HEADING);
    pdf.text("Project Summary", M, M + 14);

    // Date range
    pdf.setFont(FONT, "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLOR_MUTED);
    const dateLabel = data?.date_range?.start
      ? `${data.date_range.start} to ${data.date_range.end || "present"}`
      : "All time";
    pdf.text(dateLabel, M, M + 30);

    // Thin line under header
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(M, M + 38, pageW - M, M + 38);

    // Summary body
    renderSummaryToPdf(pdf, summaryText, M + 52, pageW, pageH);

    // Workflow map pages
    for (const map of maps) {
      if (!map.dataUrl) continue;

      pdf.addPage();

      // Map page header
      pdf.setFont(FONT, "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(...COLOR_BLUE);
      pdf.text(`Build Map: ${sanitizeForPdf(map.name)}`, M, M + 14);

      pdf.setDrawColor(186, 230, 253);
      pdf.setLineWidth(0.5);
      pdf.line(M, M + 22, pageW - M, M + 22);

      // Embed the captured map image
      const maxImgW = pageW - M * 2;
      const maxImgH = pageH - M * 2 - 50;

      // Load image to get dimensions
      const img = new Image();
      img.src = map.dataUrl;
      const imgW = img.naturalWidth || 1800;
      const imgH = img.naturalHeight || 1400;
      const scale = Math.min(maxImgW / imgW, maxImgH / imgH, 1);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = M + (maxImgW - drawW) / 2;

      pdf.addImage(map.dataUrl, "PNG", drawX, M + 32, drawW, drawH);
    }

    // Footer on every page
    const pageCount = pdf.getNumberOfPages();
    pdf.setFont(FONT, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...COLOR_FOOTER);
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.text(
        `Generated by Flowpath  |  Page ${i} of ${pageCount}`,
        M, pageH - 20,
      );
    }

    pdf.save("project_summary.pdf");
    setIsExporting(false);
  }, [data]);

  const startExport = useCallback(() => {
    if (!data?.summary) return;
    const wfs = workflows || [];
    if (summaryType === "full" && wfs.length > 0) {
      setIsExporting(true);
      setCaptureQueue({ wfIndex: 0, maps: [] });
    } else {
      setIsExporting(true);
      buildAndDownloadPdf(data.summary, []);
    }
  }, [data, workflows, summaryType, buildAndDownloadPdf]);

  const handleMapCaptured = useCallback((dataUrl) => {
    setCaptureQueue((prev) => {
      if (!prev) return null;
      const maps = [...prev.maps, {
        name: workflows[prev.wfIndex]?.name || `Workflow ${prev.wfIndex + 1}`,
        dataUrl,
      }];
      const nextIdx = prev.wfIndex + 1;
      if (nextIdx < workflows.length) {
        return { wfIndex: nextIdx, maps };
      }
      // All captured — build PDF
      buildAndDownloadPdf(data.summary, maps);
      return null;
    });
  }, [workflows, data, buildAndDownloadPdf]);

  // ── Styles ────────────────────────────────────────────────────────────────

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
          style={{ ...btnBase, border: "none", borderRadius: 0, background: mode === "all" ? color : theme.surface, color: mode === "all" ? "#fff" : theme.textSec }}
        >
          Full Summary
        </button>
        <button
          onClick={() => { setMode("range"); setTriggerFetch(false); }}
          style={{ ...btnBase, border: "none", borderRadius: 0, borderLeft: `1px solid ${theme.border}`, background: mode === "range" ? color : theme.surface, color: mode === "range" ? "#fff" : theme.textSec }}
        >
          Date Range
        </button>
      </div>

      {/* Date inputs */}
      {mode === "range" && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setTriggerFetch(false); }} style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setTriggerFetch(false); }} style={inputStyle} />
          </div>
        </div>
      )}

      {/* Generate */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || (mode === "range" && !startDate && !endDate)}
        style={{ ...btnBase, background: isLoading ? theme.border : color, color: "#fff", opacity: isLoading || (mode === "range" && !startDate && !endDate) ? 0.5 : 1, marginBottom: 20 }}
      >
        {isLoading ? "Generating..." : "Generate Summary"}
      </button>

      {/* Error */}
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
            {data.date_range?.start ? (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#4F46E5", fontFamily: F, fontWeight: 600 }}>
                {data.date_range.start} to {data.date_range.end || "present"}
              </span>
            ) : (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: "#EEF2FF", border: "1px solid #C7D2FE", color: "#4F46E5", fontFamily: F, fontWeight: 600 }}>All time</span>
            )}
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: theme.surfaceAlt || "#F9FAFB", border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
              {data.data_counts?.project_updates || 0} updates
            </span>
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: theme.surfaceAlt || "#F9FAFB", border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
              {data.data_counts?.scope_creep_items || 0} scope creep items
            </span>
          </div>

          {/* Summary text */}
          <div style={{ padding: "18px 20px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, fontSize: 13, color: theme.text, fontFamily: F, lineHeight: 1.8 }}>
            <SummaryRenderer text={data.summary} workflows={workflows} onOpenMap={onOpenMap} summaryType={summaryType} />
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => navigator.clipboard.writeText(data.summary)}
              style={{ ...btnBase, background: "transparent", color: theme.textSec, border: `1px solid ${theme.border}`, fontSize: 12 }}
            >
              Copy to Clipboard
            </button>
            <button
              onClick={startExport}
              disabled={isExporting}
              style={{ ...btnBase, background: isExporting ? theme.border : "#6366F1", color: "#fff", fontSize: 12, opacity: isExporting ? 0.6 : 1 }}
            >
              {isExporting
                ? `Exporting${captureQueue ? ` (map ${captureQueue.wfIndex + 1}/${workflows?.length || 0})` : ""}...`
                : "Export Summary PDF"}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !isLoading && !isError && (
        <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic", margin: 0 }}>
          Click "Generate Summary" to create an AI-powered summary for reporting.
        </p>
      )}

      {/* Offscreen map capture — visible to layout engine but transparent */}
      {captureQueue && workflows?.[captureQueue.wfIndex] && (
        <OffscreenMapCapture
          key={`capture-${captureQueue.wfIndex}`}
          workflow={workflows[captureQueue.wfIndex]}
          onCaptured={handleMapCaptured}
        />
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
