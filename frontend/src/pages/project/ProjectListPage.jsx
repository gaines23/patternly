import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useProjects, useProjectStats } from "@hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatDate } from "../../utils/transforms";
import PageActionButton from "../../components/ui/PageActionButton";

const F = "'Plus Jakarta Sans', sans-serif";
const DISPLAY = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";
const PURPLE = "#9B93E8";

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

function FilterIcon({ size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M4 8h8M6 12h4"/>
    </svg>
  );
}

function ChevronIcon({ size = 12, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5l3 3 3-3"/>
    </svg>
  );
}

function StatusPill({ status, theme }) {
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

/* ── Filter chip (tab-style) ──────────────────────────────────────────────── */
function FilterChip({ label, count, active, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: 999,
        border: `1px solid ${active ? theme.text : theme.borderInput}`,
        background: active ? theme.surface : "transparent",
        color: active ? theme.text : theme.textMuted,
        fontSize: 12.5, fontWeight: 500, fontFamily: F,
        cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {label}
      {count != null && (
        <>
          <span style={{ color: theme.textFaint, fontWeight: 400 }}>·</span>
          <span>{count}</span>
        </>
      )}
    </button>
  );
}

/* ── Project row (editorial list style) ───────────────────────────────────── */
function ProjectRow({ cf, theme }) {
  const [hover, setHover] = useState(false);
  const industry = cf.industries?.[0] || "—";
  const roadblocks = cf.roadblock_count || 0;
  const hasRoadblocks = roadblocks > 0;
  const hasSat = cf.satisfaction_score != null;

  // Build title: prefer `name — workflow_type`; fall back gracefully.
  const clientPart = cf.name || cf.workflow_type || "Untitled";
  const workflowPart = cf.name && cf.workflow_type ? cf.workflow_type : null;

  return (
    <Link
      to={`/projects/${cf.id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textDecoration: "none", display: "block",
        background: theme.surface,
        border: `1px solid ${hover ? theme.borderInput : theme.border}`,
        borderRadius: 10,
        padding: "20px 22px", marginBottom: 12,
        transition: "border-color 0.15s, box-shadow 0.15s",
        boxShadow: hover ? "0 1px 2px rgba(20,20,30,0.03)" : "none",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "72px 1fr 240px 140px", gap: 20, alignItems: "flex-start" }}>

        {/* LEFT: status */}
        <div>
          <StatusPill status={cf.status} theme={theme} />
        </div>

        {/* MIDDLE: title + metadata */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            margin: "0 0 4px", fontSize: 22, fontWeight: 500, fontFamily: DISPLAY,
            color: theme.text, lineHeight: 1.15, letterSpacing: "-0.02em",
          }}>
            {clientPart}
            {workflowPart && (
              <span style={{ color: theme.textMuted, fontWeight: 400 }}> — {workflowPart}</span>
            )}
          </h3>
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "4px 14px",
            fontSize: 11.5, fontFamily: MONO, color: theme.textMuted,
            marginTop: 10,
          }}>
            <span style={{ textTransform: "uppercase" }}>
              Industry <b style={{ color: theme.textSec, fontWeight: 500 }}>{industry}</b>
            </span>
            <span style={{ textTransform: "uppercase" }}>
              Logged by <b style={{ color: theme.textSec, fontWeight: 500 }}>{cf.logged_by_name || "—"}</b>
            </span>
            <span style={{ textTransform: "uppercase" }}>
              {formatDate(cf.created_at)}
            </span>
          </div>
        </div>

        {/* TOOLS */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxWidth: 260, justifyContent: "flex-end" }}>
          {(cf.tools || []).slice(0, 4).map(t => (
            <span key={t} style={{
              fontSize: 12, fontWeight: 500, color: theme.text,
              background: theme.surface, border: `1px solid ${theme.borderInput}`,
              borderRadius: 999, padding: "4px 12px", fontFamily: F, whiteSpace: "nowrap",
            }}>
              {t}
            </span>
          ))}
          {(cf.tools?.length || 0) > 4 && (
            <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F, alignSelf: "center" }}>
              +{cf.tools.length - 4}
            </span>
          )}
        </div>

        {/* RIGHT: stats */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 120 }}>
          {hasSat && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 500, fontFamily: DISPLAY, color: theme.text, lineHeight: 1, letterSpacing: "-0.02em" }}>
                {Number(cf.satisfaction_score).toFixed(1)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                SAT
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{
              fontSize: 22, fontWeight: 500, fontFamily: DISPLAY, lineHeight: 1, letterSpacing: "-0.02em",
              color: hasRoadblocks ? "#B47A2B" : theme.text,
            }}>
              {roadblocks}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: theme.textMuted, fontFamily: F,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              ROADBLOCK{roadblocks !== 1 ? "S" : ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function ProjectListPage() {
  const [filters, setFilters] = useState({ search: "", page: 1 });
  const [activeTab, setActiveTab] = useState("all"); // all | open | closed | roadblocks | needs_audit
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | name
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const sortRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isLoading, isError } = useProjects(filters);
  const { data: stats } = useProjectStats();

  const caseFiles = data?.results || [];
  const totalCount = data?.count || 0;

  // Tab counts — derived from currently-loaded data (best-effort for pagination)
  const openCount = caseFiles.filter(cf => cf.status !== "closed").length;
  const closedCount = caseFiles.filter(cf => cf.status === "closed").length;
  const roadblocksCount = caseFiles.filter(cf => (cf.roadblock_count || 0) > 0).length;
  const needsAuditCount = caseFiles.filter(cf => cf.satisfaction_score == null).length;

  const uniqueIndustries = [...new Set(caseFiles.flatMap(cf => cf.industries || []))].sort();
  const uniqueWorkflowTypes = [...new Set(caseFiles.map(cf => cf.workflow_type).filter(Boolean))].sort();
  const uniqueTools = [...new Set(caseFiles.flatMap(cf => cf.tools || []))].sort();

  const activeFilterCount = [filters.industry, filters.workflow_type, filters.tool].filter(Boolean).length;

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value || undefined, page: 1 }));
  const clearFilters = () => setFilters({ search: filters.search, page: 1 });

  // Apply tab + sort
  const tabFiltered = caseFiles.filter(cf => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return cf.status !== "closed";
    if (activeTab === "closed") return cf.status === "closed";
    if (activeTab === "roadblocks") return (cf.roadblock_count || 0) > 0;
    if (activeTab === "needs_audit") return cf.satisfaction_score == null;
    return true;
  });

  const searchFiltered = filters.search
    ? tabFiltered.filter(cf => {
        const s = filters.search.toLowerCase();
        return (cf.name || "").toLowerCase().includes(s)
          || (cf.workflow_type || "").toLowerCase().includes(s)
          || (cf.industries || []).some(i => i.toLowerCase().includes(s))
          || (cf.tools || []).some(t => t.toLowerCase().includes(s));
      })
    : tabFiltered;

  const sorted = [...searchFiltered].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    return 0;
  });

  const sortLabel = { newest: "Newest", oldest: "Oldest", name: "Name" }[sortBy];

  const tabs = [
    { id: "all", label: "All", count: null },
    { id: "open", label: "Open", count: openCount },
    { id: "closed", label: "Closed", count: closedCount },
    { id: "roadblocks", label: "With roadblocks", count: roadblocksCount },
    { id: "needs_audit", label: "Needs audit", count: needsAuditCount },
  ];

  return (
    <div className="fp-page-wrap" style={{ padding: "40px 40px 80px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        {/* Eyebrow: dot + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: PURPLE, display: "inline-block" }} />
          <span style={{
            fontSize: 11, fontWeight: 600, color: theme.textMuted,
            fontFamily: F, textTransform: "uppercase", letterSpacing: "0.14em",
          }}>
            {totalCount} documented build{totalCount !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Title + actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 style={{
              margin: "0 0 4px", fontSize: 36, fontWeight: 500, fontFamily: DISPLAY,
              color: theme.text, lineHeight: 1.1, letterSpacing: "-0.025em",
            }}>
              My Projects
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: theme.textMuted, fontFamily: F, maxWidth: 560 }}>
              Every workflow build, its roadblocks, and its outcome — in one place.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {/* Filter button */}
            <div ref={filterRef} style={{ position: "relative" }}>
              <button onClick={() => setFilterOpen(o => !o)} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 10,
                background: activeFilterCount > 0 ? theme.blueLight : theme.surface,
                border: `1.5px solid ${activeFilterCount > 0 ? theme.blueBorder : theme.borderInput}`,
                color: theme.text, fontSize: 13, fontWeight: 700, fontFamily: F,
                cursor: "pointer", whiteSpace: "nowrap",
              }}>
                <FilterIcon size={14} color={activeFilterCount > 0 ? theme.blue : theme.textMuted} />
                Filter
                {activeFilterCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: theme.blue, borderRadius: "50%", width: 17, height: 17, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30, width: 320,
                  background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "16px 18px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>Filters</span>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} style={{ fontSize: 11, fontWeight: 600, color: theme.blue, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Search */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Search</label>
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={filters.search}
                      onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
                      style={{
                        width: "100%", padding: "8px 12px", border: `1.5px solid ${theme.borderInput}`,
                        borderRadius: 8, fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Industry</label>
                    <Autocomplete
                      options={uniqueIndustries}
                      value={filters.industry || null}
                      onChange={(_, val) => setFilter("industry", val || "")}
                      clearOnEscape blurOnSelect size="small"
                      sx={autocompleteSx(theme)}
                      slotProps={{ paper: { sx: paperSx(theme) } }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="All industries" variant="outlined" size="small" />
                      )}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Workflow Type</label>
                    <Autocomplete
                      options={uniqueWorkflowTypes}
                      value={filters.workflow_type || null}
                      onChange={(_, val) => setFilter("workflow_type", val || "")}
                      clearOnEscape blurOnSelect size="small"
                      sx={autocompleteSx(theme)}
                      slotProps={{ paper: { sx: paperSx(theme) } }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="All workflow types" variant="outlined" size="small" />
                      )}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Tool</label>
                    <Autocomplete
                      options={uniqueTools}
                      value={filters.tool || null}
                      onChange={(_, val) => setFilter("tool", val || "")}
                      clearOnEscape blurOnSelect size="small"
                      sx={autocompleteSx(theme)}
                      slotProps={{ paper: { sx: paperSx(theme) } }}
                      renderInput={(params) => (
                        <TextField {...params} placeholder="All tools" variant="outlined" size="small" />
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            <PageActionButton to="/projects/new">New Project</PageActionButton>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: theme.border, marginBottom: 20 }} />

      {/* ── Tabs + Sort ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map(tab => (
            <FilterChip
              key={tab.id}
              label={tab.label}
              count={tab.count}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              theme={theme}
            />
          ))}
        </div>

        {/* Sort dropdown */}
        <div ref={sortRef} style={{ position: "relative" }}>
          <button onClick={() => setSortOpen(o => !o)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 6px", background: "transparent", border: "none",
            fontSize: 13, fontFamily: F, color: theme.textMuted, cursor: "pointer",
          }}>
            <span style={{ color: theme.textMuted }}>Sorted by</span>
            <span style={{ fontWeight: 600, color: theme.text }}>{sortLabel}</span>
            <ChevronIcon size={12} color={theme.textMuted} />
          </button>
          {sortOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 20, minWidth: 140,
              background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 4,
            }}>
              {[
                { id: "newest", label: "Newest" },
                { id: "oldest", label: "Oldest" },
                { id: "name", label: "Name" },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSortBy(opt.id); setSortOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "8px 12px", border: "none", borderRadius: 6,
                    background: sortBy === opt.id ? theme.surfaceAlt : "transparent",
                    fontSize: 13, fontFamily: F,
                    color: sortBy === opt.id ? theme.text : theme.textMuted,
                    fontWeight: sortBy === opt.id ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading projects…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load. Please refresh.</div>
      ) : sorted.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 16, color: theme.textMuted, fontFamily: F }}>
            {filters.search || activeTab !== "all"
              ? "No results match your filters."
              : "No project files yet. Log your first build."}
          </p>
        </div>
      ) : (
        <div>
          {sorted.map((cf) => (
            <ProjectRow
              key={cf.id}
              cf={cf}
              theme={theme}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(data?.next || data?.previous) && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
          {data.previous && (
            <button onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              style={{ padding: "8px 16px", border: `1px solid ${theme.borderInput}`, borderRadius: 8, background: theme.surface, color: theme.text, fontSize: 13, fontFamily: F, cursor: "pointer" }}>
              ← Previous
            </button>
          )}
          {data.next && (
            <button onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              style={{ padding: "8px 16px", border: `1px solid ${theme.borderInput}`, borderRadius: 8, background: theme.surface, color: theme.text, fontSize: 13, fontFamily: F, cursor: "pointer" }}>
              Next →
            </button>
          )}
        </div>
      )}

    </div>
  );
}
