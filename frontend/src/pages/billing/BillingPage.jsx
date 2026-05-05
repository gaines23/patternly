import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useTheme } from "@hooks/useTheme";
import { useBilling, useToggleBillingShare } from "@hooks/useProjects";
import { formatMinutes } from "@utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const DISPLAY = "'Plus Jakarta Sans', sans-serif";
const PURPLE = "#9B93E8";
const ACCENT = "#0284C7";
const ACCENT_BG = "#F0F9FF";
const ACCENT_BORDER = "#BAE6FD";
const ACCENT_PILL_BG = "#E0F2FE";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Local-date ISO (YYYY-MM-DD) — avoids the UTC drift that `toISOString()` causes
// for users in non-UTC timezones near midnight.
function toLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayISO() {
  return toLocalISO(new Date());
}
function firstOfMonthISO() {
  const d = new Date();
  return toLocalISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

function formatDateLabel(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function totalMinutes(updates) {
  return updates.reduce((s, u) => s + (Number(u.minutes_spent) || 0), 0);
}

// ── MUI input styling (mirrors AllProjectsPage) ──────────────────────────────

const autocompleteSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg,
    borderRadius: "8px", padding: "0 9px 0 0 !important", height: "38px",
    "& fieldset": { borderColor: theme.borderInput, borderWidth: "1.5px" },
    "&:hover fieldset": { borderColor: theme.borderInput },
    "&.Mui-focused fieldset": { borderColor: theme.blue, borderWidth: "1.5px", boxShadow: `0 0 0 3px ${theme.blueLight}` },
  },
  "& .MuiInputBase-input": { padding: "0 13px !important", color: theme.text, fontFamily: F, fontSize: 13, height: "100%", boxSizing: "border-box" },
  "& .MuiAutocomplete-clearIndicator": { color: theme.textFaint },
  "& .MuiAutocomplete-popupIndicator": { color: theme.textFaint },
});

const paperSx = (theme) => ({
  background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "8px", mt: "4px",
  "& .MuiAutocomplete-option": { fontSize: 13, fontFamily: F, color: theme.text },
  "& .MuiAutocomplete-option.Mui-focused": { background: theme.surfaceAlt },
  "& .MuiAutocomplete-noOptions": { fontSize: 13, fontFamily: F, color: theme.textMuted },
});

// ── Note card — mirrors ProjectUpdateItem in ProjectDetailPage ───────────────

function NoteCard({ pu, showProject = false }) {
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
        {showProject && pu.case_file_name && (
          <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT, fontFamily: F, opacity: 0.8 }}>
            · {pu.case_file_name}
          </span>
        )}
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
        <div style={{ padding: "12px 14px" }}>
          {pu.content && (
            <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {pu.content}
            </p>
          )}
          {pu.attachments?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pu.attachments.map((att, ai) => att.url && (
                <span key={ai} style={{
                  fontSize: 12, color: ACCENT, background: ACCENT_PILL_BG,
                  border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "3px 10px",
                  fontFamily: F, fontWeight: 500,
                }}>
                  {att.name || att.url}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Project section (collapsible) — used when "All projects" is selected ────

function ProjectGroup({ projectName, updates, theme }) {
  const [open, setOpen] = useState(true);
  const totalLabel = formatMinutes(totalMinutes(updates));
  const sorted = useMemo(
    () => [...updates].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [updates],
  );

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px",
          background: open ? `${ACCENT}12` : theme.surface,
          borderRadius: open ? "10px 10px 0 0" : 10,
          border: `1px solid ${open ? ACCENT + "40" : theme.border}`,
          borderBottom: open ? `1.5px solid ${ACCENT}50` : `1px solid ${theme.border}`,
          cursor: "pointer", userSelect: "none",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 20, height: 20, borderRadius: "50%",
            border: `2px solid ${open ? ACCENT : theme.borderInput}`,
            background: open ? `${ACCENT}15` : "transparent", flexShrink: 0,
          }} />
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: open ? ACCENT : theme.text, fontFamily: F }}>
              {projectName}
            </p>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
              {updates.length} note{updates.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {totalLabel && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT_PILL_BG,
              border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "3px 10px", fontFamily: F,
            }}>
              ⏱ Total: {totalLabel}
            </span>
          )}
          <span style={{
            fontSize: 16, color: open ? ACCENT : theme.textMuted, display: "inline-block",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s, color 0.15s",
          }}>
            ▾
          </span>
        </div>
      </div>

      {open && (
        <div style={{
          background: theme.surface,
          border: `1px solid ${ACCENT}40`,
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "14px",
        }}>
          {sorted.map(pu => <NoteCard key={pu.id} pu={pu} />)}
        </div>
      )}
    </div>
  );
}

// ── Share modal ──────────────────────────────────────────────────────────────

function BillingShareModal({ shareToken, shareEnabled, dateFrom, dateTo, onClose }) {
  const { theme } = useTheme();
  const toggle = useToggleBillingShare();
  const [copied, setCopied] = useState(false);

  const shareUrl = shareToken
    ? (() => {
        const params = new URLSearchParams();
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo)   params.set("to",   dateTo);
        const q = params.toString();
        return `${window.location.origin}/billing-report/${shareToken}${q ? `?${q}` : ""}`;
      })()
    : null;

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.surfaceRaised, borderRadius: 16, padding: "28px 32px",
          maxWidth: 540, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Fraunces', serif", color: theme.text }}>
            Share billing report
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textFaint, lineHeight: 1 }}>x</button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: theme.textMuted, fontFamily: F, lineHeight: 1.6 }}>
          Generate a read-only link recipients can use to view your billing report. The link uses the date range currently selected.
        </p>

        <div style={{ padding: "16px 0", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontFamily: F, color: theme.text, fontWeight: 600, flex: 1 }}>
              Public link
            </span>
            <button
              onClick={() => toggle.mutate()}
              disabled={toggle.isPending}
              style={{
                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                background: shareEnabled ? ACCENT : "#D1D5DB",
                position: "relative", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              <span style={{
                position: "absolute", top: 3, left: shareEnabled ? 22 : 3,
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                transition: "left 0.2s", display: "block",
              }} />
            </button>
            <span style={{ fontSize: 12, fontFamily: F, color: shareEnabled ? "#059669" : "#9CA3AF", width: 36 }}>
              {shareEnabled ? "On" : "Off"}
            </span>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: theme.textFaint, fontFamily: F, lineHeight: 1.5 }}>
            When enabled, anyone with the link can view this report. Turning it off revokes access immediately.
          </p>
          {shareEnabled && shareUrl && (
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                readOnly
                value={shareUrl}
                style={{
                  flex: 1, fontFamily: F, fontSize: 11, color: theme.textSec,
                  border: `1.5px solid ${theme.borderInput}`, borderRadius: 8, padding: "8px 10px",
                  background: theme.inputBgDisabled, outline: "none",
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: "8px 14px", borderRadius: 8, border: "none",
                  background: copied ? "#059669" : ACCENT,
                  color: "#fff", fontSize: 12, fontWeight: 600,
                  fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
                  transition: "background 0.2s",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <p style={{ margin: "14px 0 0", fontSize: 12, color: theme.textFaint, fontFamily: F, lineHeight: 1.5 }}>
          The recipient will see your name, the date range, total hours, and notes grouped by client.
        </p>
      </div>
    </div>,
    document.body,
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { theme } = useTheme();
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [selectedProject, setSelectedProject] = useState(null); // {id, name} | null
  const [shareOpen, setShareOpen] = useState(false);

  const { data, isLoading, isError } = useBilling({
    dateFrom,
    dateTo,
    caseFile: selectedProject?.id,
  });

  const updates = data?.updates || [];
  const projects = data?.projects || [];
  const totalLabel = formatMinutes(data?.total_minutes ?? 0);
  const shareEnabled = !!data?.share_enabled;
  const shareToken = data?.share_token;

  // Group by project when "All" is selected
  const groupedByProject = useMemo(() => {
    if (selectedProject) return null;
    const map = new Map();
    for (const pu of updates) {
      const key = pu.case_file_id;
      if (!map.has(key)) map.set(key, { name: pu.case_file_name, updates: [] });
      map.get(key).updates.push(pu);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, name: v.name, updates: v.updates }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [updates, selectedProject]);

  // Single-project view: just sort notes by date desc
  const singleProjectSorted = useMemo(() => {
    if (!selectedProject) return null;
    return [...updates].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }, [updates, selectedProject]);

  return (
    <div className="fp-page-wrap" style={{ padding: "40px 40px 80px", maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PURPLE, display: "inline-block" }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: theme.textMuted,
            fontFamily: F, textTransform: "uppercase", letterSpacing: "0.14em",
          }}>
            Hours & notes for billing
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 style={{
              margin: "0 0 4px", fontSize: 36, fontWeight: 500, fontFamily: DISPLAY,
              color: theme.text, lineHeight: 1.1, letterSpacing: "-0.025em",
            }}>
              Billing
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: theme.textMuted, fontFamily: F, maxWidth: 620 }}>
              Pull all hours and project notes within a timeframe — across every project, or a single one.
            </p>
          </div>
          <button
            onClick={() => setShareOpen(true)}
            disabled={!shareToken}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: 10,
              background: shareEnabled ? ACCENT : theme.surface,
              border: `1.5px solid ${shareEnabled ? ACCENT : theme.borderInput}`,
              color: shareEnabled ? "#fff" : theme.text,
              fontFamily: F, fontSize: 13, fontWeight: 600,
              cursor: shareToken ? "pointer" : "not-allowed",
              opacity: shareToken ? 1 : 0.6,
              whiteSpace: "nowrap",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/>
              <path d="M5.7 7l4.6-2.5M5.7 9l4.6 2.5"/>
            </svg>
            {shareEnabled ? "Sharing on" : "Share report"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 2fr",
        gap: 14,
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: "16px 18px",
        marginBottom: 20,
      }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={e => setDateFrom(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", border: `1.5px solid ${theme.borderInput}`,
              borderRadius: 8, fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg,
              outline: "none", boxSizing: "border-box", height: 38,
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            To
          </label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={e => setDateTo(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", border: `1.5px solid ${theme.borderInput}`,
              borderRadius: 8, fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg,
              outline: "none", boxSizing: "border-box", height: 38,
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Project
          </label>
          <Autocomplete
            options={projects}
            getOptionLabel={(o) => o?.name || ""}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            value={selectedProject}
            onChange={(_, val) => setSelectedProject(val || null)}
            clearOnEscape blurOnSelect size="small"
            sx={autocompleteSx(theme)}
            slotProps={{ paper: { sx: paperSx(theme) } }}
            renderInput={(params) => (
              <TextField {...params} placeholder="All projects" variant="outlined" size="small" />
            )}
          />
        </div>
      </div>

      {/* Summary bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 12.5, color: theme.textMuted, fontFamily: F }}>
          {isLoading ? "Loading…"
            : `${updates.length} note${updates.length !== 1 ? "s" : ""}`
              + (selectedProject ? ` for ${selectedProject.name}` : " across all projects")
              + ` · ${formatDateLabel(dateFrom)} – ${formatDateLabel(dateTo)}`}
        </div>
        {totalLabel && (
          <span style={{
            fontSize: 12, fontWeight: 700, color: ACCENT, background: ACCENT_PILL_BG,
            border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, padding: "5px 12px", fontFamily: F,
          }}>
            ⏱ Total logged: {totalLabel}
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load. Please refresh.</div>
      ) : updates.length === 0 ? (
        <div style={{
          padding: "60px 20px", textAlign: "center",
          background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14,
        }}>
          <p style={{ fontSize: 16, color: theme.textMuted, fontFamily: F }}>
            No hours or notes logged in this timeframe.
          </p>
        </div>
      ) : selectedProject ? (
        <div>
          {singleProjectSorted.map(pu => <NoteCard key={pu.id} pu={pu} />)}
        </div>
      ) : (
        <div>
          {groupedByProject.map(g => (
            <ProjectGroup key={g.id} projectName={g.name} updates={g.updates} theme={theme} />
          ))}
        </div>
      )}

      {shareOpen && (
        <BillingShareModal
          shareToken={shareToken}
          shareEnabled={shareEnabled}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  );
}
