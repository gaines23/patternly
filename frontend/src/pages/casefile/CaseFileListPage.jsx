import { useState } from "react";
import { Link } from "react-router-dom";
import { useCaseFiles, useDeleteCaseFile } from "../../hooks/useCaseFiles";
import { useTheme } from "../../hooks/useTheme";
import { formatDate, satisfactionLabel } from "../../utils/transforms";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

const F = "'Plus Jakarta Sans', sans-serif";

export default function CaseFileListPage() {
  const [filters, setFilters] = useState({ search: "", page: 1 });
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const { theme } = useTheme();

  const { data, isLoading, isError } = useCaseFiles(filters);
  const deleteMutation = useDeleteCaseFile();

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

  const satColors = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#10B981", 5: "#059669" };

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>Projects</h1>
          <p style={{ margin: 0, fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            {totalCount} build{totalCount !== 1 ? "s" : ""} documented
          </p>
        </div>
        <Link to="/case-files/new">
          <button style={{ padding: "10px 20px", background: theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
            + New Project File
          </button>
        </Link>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search by workflow type, industry, or tool…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "10px 14px",
            border: `1.5px solid ${theme.borderInput}`,
            borderRadius: 9,
            fontSize: 14,
            fontFamily: F,
            color: theme.text,
            background: theme.inputBg,
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; }}
          onBlur={(e) => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading project files…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load. Please refresh.</div>
      ) : caseFiles.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 16, color: theme.textMuted, fontFamily: F }}>
            {filters.search ? "No results match your search." : "No project files yet. Log your first build."}
          </p>
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div className="fp-cf-header" style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 120px 80px 100px 80px",
            gap: 12,
            padding: "8px 16px",
            marginBottom: 4,
          }}>
            {["Workflow", "Industry", "Logged by", "Status", "Date", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: theme.textFaint, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: F }}>
                {h}
              </span>
            ))}
          </div>

          {[...caseFiles].sort((a, b) => (a.name || a.workflow_type || "").localeCompare(b.name || b.workflow_type || "")).map((cf) => (
            <div key={cf.id} className="fp-cf-row" style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 120px 80px 100px 80px",
              gap: 12,
              alignItems: "center",
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              transition: "border-color 0.15s",
            }}>
              {/* Workflow + tags */}
              <div style={{ minWidth: 0 }}>
                <Link to={`/case-files/${cf.id}`} style={{ textDecoration: "none" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>
                    {cf.name || "Untitled"}
                  </p>
                </Link>
                {cf.workflow_type && (
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: theme.textMuted, fontFamily: F }}>{cf.workflow_type}</p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                  {cf.tools?.slice(0, 3).map((t) => (
                    <span key={t} style={{ fontSize: 11, color: theme.blue, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 10, padding: "1px 7px", fontFamily: F }}>
                      {t}
                    </span>
                  ))}
                  {cf.roadblock_count > 0 && (
                    <span style={{ fontSize: 11, color: "#EA580C", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "1px 7px", fontFamily: F }}>
                      {cf.roadblock_count} block{cf.roadblock_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Industry */}
              <span className="fp-cf-col-industry" style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
                {cf.industries?.[0] || "—"}
              </span>

              {/* Logged by */}
              <span className="fp-cf-col-logged-by" style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
                {cf.logged_by_name}
              </span>

              {/* Status */}
              <span className="fp-cf-col-status" style={{
                alignSelf: "center", width: "fit-content",
                fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
                background: cf.status === "closed" ? "#ECFDF5" : "#EEEAF8",
                border: `1px solid ${cf.status === "closed" ? "#6EE7B7" : "#C8C2E8"}`,
                color: cf.status === "closed" ? "#065F46" : "#7B72B8",
                fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
                whiteSpace: "nowrap", textAlign: "center",
              }}>
                {cf.status === "closed" ? "Closed" : "Open"}
              </span>

              {/* Date */}
              <span className="fp-cf-col-date" style={{ fontSize: 12, color: theme.textFaint, fontFamily: F }}>
                {formatDate(cf.created_at)}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Link to={`/case-files/${cf.id}/edit`}>
                  <button style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${theme.borderInput}`, borderRadius: 6, fontSize: 12, color: theme.textMuted, fontFamily: F, cursor: "pointer" }}>
                    Edit
                  </button>
                </Link>
                <button
                  onClick={() => setDeleteTarget({ id: cf.id, name: cf.name || "Untitled" })}
                  disabled={deleting === cf.id}
                  style={{ padding: "5px 10px", background: "transparent", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#EF4444", fontFamily: F, cursor: "pointer" }}
                >
                  {deleting === cf.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data?.next || data?.previous ? (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
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
          ) : null}
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
