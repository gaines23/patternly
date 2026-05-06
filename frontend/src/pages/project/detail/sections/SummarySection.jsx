import { useState, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { useTheme } from "@hooks/useTheme";
import { useProjectSummary } from "@hooks/useProjects";
import { useMyTeam } from "@hooks/useUsers";
import { WorkflowMapPanel } from "@components/WorkflowMapPanel";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import Section from "../components/Section";
import { F } from "../constants";

// Fetch a remote image and return a data URL. Avoids CORS issues when
// html-to-image serializes the offscreen DOM for PDF capture.
async function urlToDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Shared brief Section component (matches SharedBriefPage exactly) ────────

function BriefSection({ title, subtitle, color, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px",
        background: `${color}12`,
        borderRadius: "10px 10px 0 0",
        border: `1px solid ${color}40`,
        borderBottom: `1.5px solid ${color}50`,
      }}>
        <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color, fontFamily: F }}>{title}</p>
          {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: F }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{
        background: "#fff",
        border: `1px solid ${color}40`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        padding: "12px 14px",
      }}>
        {children}
      </div>
    </div>
  );
}

function SummaryTextBlock({ text }) {
  if (!text) return null;
  return (
    <div style={{ fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.45 }}>
      {text.split("\n").map((line, li) => {
        const trimmed = line.trim();
        if (trimmed === "") return <div key={li} style={{ height: 4 }} />;
        const boldMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
        if (boldMatch) {
          return <p key={li} style={{ margin: "8px 0 2px", fontSize: 14, fontWeight: 700, color: "#1F2937", fontFamily: F }}>{boldMatch[1]}</p>;
        }
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        const rendered = parts.map((part, pi) => {
          const m = part.match(/^\*\*(.*?)\*\*$/);
          if (m) return <strong key={pi}>{m[1]}</strong>;
          return <span key={pi}>{part}</span>;
        });
        return <p key={li} style={{ margin: "1px 0", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.45 }}>{rendered}</p>;
      })}
    </div>
  );
}

// ── PDF page layout (renders exact SharedBriefPage layout as React → image) ─

function PdfPageLayout({ projectName, preparedBy, sectionTitle, sectionSubtitle, sectionColor, summaryText, teamLogoDataUrl }) {
  return (
    <div style={{ width: 700, background: "#F8FAFC", fontFamily: F }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "10px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {teamLogoDataUrl ? (
          <img src={teamLogoDataUrl} alt="" style={{ height: 32, maxWidth: 220, objectFit: "contain", display: "block" }} />
        ) : (
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Patternly
          </span>
        )}
        <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: F, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "3px 10px" }}>
          Read-only
        </span>
      </div>

      <div style={{ padding: "20px 28px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontFamily: "'Fraunces', serif", color: "#111827" }}>
            {projectName}
          </h1>
          {preparedBy && (
            <div style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>
              Prepared by <strong style={{ color: "#374151" }}>{preparedBy}</strong>
            </div>
          )}
        </div>

        {/* Section */}
        <BriefSection title={sectionTitle} subtitle={sectionSubtitle} color={sectionColor}>
          <SummaryTextBlock text={summaryText} />
        </BriefSection>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 14, borderTop: "1px solid #E5E7EB" }}>
          <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F, margin: 0 }}>
            Generated by <strong style={{ color: "#6B7280" }}>Patternly</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Load image dimensions reliably (await decode before reading size) ───────

function loadImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
}

// ── Capture a React element as a PNG data URL ───────────────────────────────

function captureReactElement(element) {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:-1;";
    document.body.appendChild(container);
    const root = createRoot(container);
    root.render(element);

    setTimeout(() => {
      toPng(container.firstChild || container, { backgroundColor: "#F8FAFC", pixelRatio: 2, skipFonts: true })
        .then((dataUrl) => {
          root.unmount();
          document.body.removeChild(container);
          resolve(dataUrl);
        })
        .catch(() => {
          root.unmount();
          document.body.removeChild(container);
          resolve(null);
        });
    }, 400);
  });
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
    setTimeout(() => {
      toPng(el, { backgroundColor: "#ffffff", pixelRatio: 2, skipFonts: true })
        .then((dataUrl) => onCaptured(dataUrl))
        .catch(() => onCaptured(null));
    }, 1500);
  }, [onCaptured]);

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
  projectName = "Project",
  preparedBy = "",
  summaryType = "full",
  title = "Full Project Summary",
  subtitle = "AI-generated summary of the full project for reporting",
  color = "#6366F1",
  embedded = false,
  workflows = [],
  onOpenMap,
  savedSummary = "",
  savedGeneratedAt = null,
}) {
  const { theme } = useTheme();
  const myTeam = useMyTeam();
  const teamLogoUrl = myTeam?.data?.logo || null;
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

  const { data: freshData, isLoading, isError, error } = useProjectSummary(caseFileId, {
    summaryType,
    ...queryDates,
    enabled: triggerFetch,
  });

  const data = freshData || (savedSummary ? {
    summary: savedSummary,
    generated_at: savedGeneratedAt,
    date_range: { start: null, end: null },
    data_counts: {},
  } : null);

  const generatedAt = freshData?.generated_at || savedGeneratedAt;

  const handleGenerate = () => {
    setTriggerFetch(false);
    setTimeout(() => setTriggerFetch(true), 50);
  };

  // ── PDF Export ────────────────────────────────────────────────────────────

  const buildAndDownloadPdf = useCallback(async (summaryText, maps) => {
    const pageW = 595;
    const pageH = 842;

    // Determine section label
    const sectionTitle = summaryType === "full" ? "Project Summary" : "Progress Overview";
    const sectionSubtitle = summaryType === "full"
      ? "Full project summary for reporting"
      : "Project updates and scope change summary";
    const sectionColor = summaryType === "full" ? "#6366F1" : "#6366F1";

    // Inline the team logo (if any) as a data URL so html-to-image can
    // serialize it without hitting CORS.
    const teamLogoDataUrl = await urlToDataUrl(teamLogoUrl);

    // 1. Capture the summary page as an image (matches SharedBriefPage layout)
    const summaryImg = await captureReactElement(
      <PdfPageLayout
        projectName={projectName}
        preparedBy={preparedBy}
        sectionTitle={sectionTitle}
        sectionSubtitle={sectionSubtitle}
        sectionColor={sectionColor}
        summaryText={summaryText}
        teamLogoDataUrl={teamLogoDataUrl}
      />
    );

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // Place summary image — may span multiple pages
    if (summaryImg) {
      const { width: imgW, height: imgH } = await loadImageDimensions(summaryImg);

      const fitW = pageW;
      const scale = fitW / imgW;
      const totalH = imgH * scale;

      // If it fits on one page
      if (totalH <= pageH) {
        pdf.addImage(summaryImg, "PNG", 0, 0, fitW, totalH);
      } else {
        // Split across pages by slicing the image
        let yOffset = 0;
        let firstPage = true;
        while (yOffset < totalH) {
          if (!firstPage) pdf.addPage();
          firstPage = false;
          // Draw the full image offset upward so the current slice is visible
          pdf.addImage(summaryImg, "PNG", 0, -yOffset, fitW, totalH);
          yOffset += pageH;
        }
      }
    }

    // 2. Workflow map pages
    for (const map of maps) {
      if (!map.dataUrl) continue;
      pdf.addPage();

      const margin = 20;
      const maxImgW = pageW - margin * 2;
      const maxImgH = pageH - margin * 2;
      const { width: mW, height: mH } = await loadImageDimensions(map.dataUrl);
      const mScale = Math.min(maxImgW / mW, maxImgH / mH, 1);
      const drawW = mW * mScale;
      const drawH = mH * mScale;
      const drawX = (pageW - drawW) / 2;
      pdf.addImage(map.dataUrl, "PNG", drawX, margin, drawW, drawH);
    }

    // 3. Page numbers
    const pageCount = pdf.getNumberOfPages();
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      const label = `Page ${i} of ${pageCount}`;
      const labelW = pdf.getTextWidth(label);
      pdf.text(label, (pageW - labelW) / 2, pageH - 14);
    }

    const slug = projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    pdf.save(`${slug}_${summaryType}_summary.pdf`);
    setIsExporting(false);
  }, [data, projectName, preparedBy, summaryType, teamLogoUrl]);

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

      {/* Generate / Regenerate */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={handleGenerate}
          disabled={isLoading || (mode === "range" && !startDate && !endDate)}
          style={{ ...btnBase, background: isLoading ? theme.border : color, color: "#fff", opacity: isLoading || (mode === "range" && !startDate && !endDate) ? 0.5 : 1 }}
        >
          {isLoading ? "Generating..." : data ? "Regenerate Summary" : "Generate Summary"}
        </button>
        {generatedAt && !isLoading && (
          <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F }}>
            Last generated {new Date(generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        )}
      </div>

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
            {data.data_counts?.project_updates != null && (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: theme.surfaceAlt || "#F9FAFB", border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
                {data.data_counts.project_updates} updates
              </span>
            )}
            {data.data_counts?.scope_creep_items != null && (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: theme.surfaceAlt || "#F9FAFB", border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
                {data.data_counts.scope_creep_items} scope creep items
              </span>
            )}
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

      {/* Offscreen map capture */}
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
