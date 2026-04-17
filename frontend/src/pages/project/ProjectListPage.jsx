import { useState } from "react";
import { Link } from "react-router-dom";
import { useProjects, useDeleteProject } from "@hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatDate } from "../../utils/transforms";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

const F = "'Plus Jakarta Sans', sans-serif";

function GridIcon({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/>
      <rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>
    </svg>
  );
}

function ListIcon({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 5h12M4 10h12M4 15h12"/><circle cx="4" cy="5" r="0.5" fill={color}/><circle cx="4" cy="10" r="0.5" fill={color}/><circle cx="4" cy="15" r="0.5" fill={color}/>
    </svg>
  );
}

function FilterIcon({ size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M4 8h8M6 12h4"/>
    </svg>
  );
}

function IndustryIcon({ size = 15, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="4" height="8" rx="0.5"/><rect x="6" y="3" width="4" height="11" rx="0.5"/><rect x="10" y="6" width="4" height="8" rx="0.5"/>
    </svg>
  );
}

function WorkflowIcon({ size = 15, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="6" height="5" rx="1"/><rect x="9" y="9" width="6" height="5" rx="1"/><path d="M7 4.5h2.5V11H9"/>
    </svg>
  );
}

function UserIcon({ size = 14, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5"/>
    </svg>
  );
}

function CalendarIcon({ size = 14, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6.5h12M5 2v2M11 2v2"/>
    </svg>
  );
}

function StatusBadge({ status, theme }) {
  const isOpen = status !== "closed";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 10,
      background: isOpen ? "#EFF6FF" : "#ECFDF5",
      border: `1px solid ${isOpen ? "#BFDBFE" : "#6EE7B7"}`,
      color: isOpen ? "#1D4ED8" : "#065F46",
      fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
    }}>
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

/* ── Card view ──────────────────────────────────────────────────────────────── */
function ProjectCard({ cf, theme, onDelete, deleting }) {
  return (
    <Link to={`/projects/${cf.id}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 10,
      background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14,
      padding: "20px 22px", transition: "border-color 0.15s, box-shadow 0.15s", cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.blueBorder; e.currentTarget.style.boxShadow = `0 2px 12px rgba(0,0,0,0.06)`; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Title + status */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: theme.text, fontFamily: F }}>
            {cf.name || "Untitled"}
          </span>
          <StatusBadge status={cf.status} theme={theme} />
        </div>
        {cf.workflow_type && (
          <p style={{ margin: 0, fontSize: 13, color: theme.textMuted, fontFamily: F }}>{cf.workflow_type}</p>
        )}
      </div>

      {/* Tools */}
      {cf.tools?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {cf.tools.slice(0, 4).map(t => (
            <span key={t} style={{
              fontSize: 11, fontWeight: 500, color: theme.text, background: theme.surfaceAlt,
              border: `1px solid ${theme.border}`, borderRadius: 8, padding: "3px 10px", fontFamily: F,
            }}>{t}</span>
          ))}
          {cf.tools.length > 4 && (
            <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F, alignSelf: "center" }}>+{cf.tools.length - 4}</span>
          )}
        </div>
      )}

      {/* Industry + workflow type */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
        {cf.industries?.[0] && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IndustryIcon size={15} color={theme.textFaint} />
            <span style={{ fontSize: 13, color: theme.textSec, fontFamily: F }}>{cf.industries[0]}</span>
          </div>
        )}
        {cf.workflow_type && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <WorkflowIcon size={15} color={theme.textFaint} />
            <span style={{ fontSize: 13, color: theme.textSec, fontFamily: F }}>{cf.workflow_type}</span>
          </div>
        )}
      </div>

      {/* Footer: logged by + date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${theme.borderSubtle}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <UserIcon size={14} color={theme.textFaint} />
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{cf.logged_by_name || "—"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarIcon size={14} color={theme.textFaint} />
          <span style={{ fontSize: 12, color: theme.textFaint, fontFamily: F }}>{formatDate(cf.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

/* ── List row view ──────────────────────────────────────────────────────────── */
function ProjectRow({ cf, theme, onDelete, deleting }) {
  return (
    <div className="fp-cf-row" style={{
      display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 100px 80px",
      gap: 12, alignItems: "center", background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 6,
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)", transition: "border-color 0.15s",
    }}>
      <div style={{ minWidth: 0 }}>
        <Link to={`/projects/${cf.id}`} style={{ textDecoration: "none" }}>
          <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>{cf.name || "Untitled"}</p>
        </Link>
        {cf.workflow_type && <p style={{ margin: "0 0 4px", fontSize: 12, color: theme.textMuted, fontFamily: F }}>{cf.workflow_type}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {cf.tools?.slice(0, 3).map(t => (
            <span key={t} style={{ fontSize: 11, color: theme.blue, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 10, padding: "1px 7px", fontFamily: F }}>{t}</span>
          ))}
          {cf.roadblock_count > 0 && (
            <span style={{ fontSize: 11, color: "#EA580C", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "1px 7px", fontFamily: F }}>
              {cf.roadblock_count} block{cf.roadblock_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <span className="fp-cf-col-industry" style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{cf.industries?.[0] || "—"}</span>
      <span className="fp-cf-col-logged-by" style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{cf.logged_by_name}</span>
      <span className="fp-cf-col-status"><StatusBadge status={cf.status} theme={theme} /></span>
      <span className="fp-cf-col-date" style={{ fontSize: 12, color: theme.textFaint, fontFamily: F }}>{formatDate(cf.created_at)}</span>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <Link to={`/projects/${cf.id}/edit`}>
          <button style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${theme.borderInput}`, borderRadius: 6, fontSize: 12, color: theme.textMuted, fontFamily: F, cursor: "pointer" }}>Edit</button>
        </Link>
        <button onClick={() => onDelete({ id: cf.id, name: cf.name || "Untitled" })} disabled={deleting === cf.id}
          style={{ padding: "5px 10px", background: "transparent", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#EF4444", fontFamily: F, cursor: "pointer" }}>
          {deleting === cf.id ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function CaseFileListPage() {
  const [filters, setFilters] = useState({ search: "", page: 1 });
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [view, setView] = useState("grid");
  const { theme } = useTheme();

  const { data, isLoading, isError } = useProjects(filters);
  const deleteMutation = useDeleteProject();

  const caseFiles = data?.results || [];
  const totalCount = data?.count || 0;

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const sorted = [...caseFiles].sort((a, b) => (a.name || a.workflow_type || "").localeCompare(b.name || b.workflow_type || ""));

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 1100 }}>

      {/* Toolbar: search + filter + view toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={theme.textFaint} strokeWidth="1.5" strokeLinecap="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
            style={{
              width: "100%", padding: "11px 14px 11px 38px", border: `1.5px solid ${theme.borderInput}`,
              borderRadius: 10, fontSize: 14, fontFamily: F, color: theme.text, background: theme.inputBg,
              outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; }}
            onBlur={e => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Filter button */}
        <button style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
          background: theme.surface, border: `1.5px solid ${theme.borderInput}`, borderRadius: 10,
          fontSize: 13, fontWeight: 600, fontFamily: F, color: theme.text, cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = theme.blue}
        onMouseLeave={e => e.currentTarget.style.borderColor = theme.borderInput}>
          <FilterIcon size={16} color={theme.textMuted} />
          Filter
        </button>

        {/* View toggle */}
        <div style={{ display: "flex", border: `1.5px solid ${theme.borderInput}`, borderRadius: 10, overflow: "hidden" }}>
          <button onClick={() => setView("grid")} style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
            background: view === "grid" ? theme.text : theme.surface, border: "none", cursor: "pointer",
            transition: "background 0.15s",
          }}>
            <GridIcon size={18} color={view === "grid" ? theme.surface : theme.textFaint} />
          </button>
          <button onClick={() => setView("list")} style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
            background: view === "list" ? theme.text : theme.surface, border: "none", cursor: "pointer",
            borderLeft: `1px solid ${theme.borderInput}`, transition: "background 0.15s",
          }}>
            <ListIcon size={18} color={view === "list" ? theme.surface : theme.textFaint} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading projects…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load. Please refresh.</div>
      ) : caseFiles.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 16, color: theme.textMuted, fontFamily: F }}>
            {filters.search ? "No results match your search." : "No project files yet. Log your first build."}
          </p>
        </div>
      ) : view === "grid" ? (
        /* ── Grid view ─────────────────────────────────────── */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {sorted.map(cf => (
            <ProjectCard key={cf.id} cf={cf} theme={theme} onDelete={setDeleteTarget} deleting={deleting} />
          ))}
        </div>
      ) : (
        /* ── List view ─────────────────────────────────────── */
        <div>
          <div className="fp-cf-header" style={{
            display: "grid", gridTemplateColumns: "1fr 160px 120px 80px 100px 80px",
            gap: 12, padding: "8px 16px", marginBottom: 4,
          }}>
            {["Workflow", "Industry", "Logged by", "Status", "Date", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: theme.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: F }}>{h}</span>
            ))}
          </div>
          {sorted.map(cf => (
            <ProjectRow key={cf.id} cf={cf} theme={theme} onDelete={setDeleteTarget} deleting={deleting} />
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

      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
