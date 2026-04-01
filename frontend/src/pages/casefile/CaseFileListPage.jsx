import { useState } from "react";
import { Link } from "react-router-dom";
import { useCaseFiles, useDeleteCaseFile } from "../../hooks/useCaseFiles";
import { formatDate, satisfactionLabel } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

export default function CaseFileListPage() {
  const [filters, setFilters] = useState({ search: "", page: 1 });
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading, isError } = useCaseFiles(filters);
  const deleteMutation = useDeleteCaseFile();

  const caseFiles = data?.results || [];
  const totalCount = data?.count || 0;

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this case file? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setDeleting(null);
    }
  };

  const satColors = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#10B981", 5: "#059669" };

  return (
    <div style={{ padding: "32px 32px 80px", maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>Case Files</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6B7280", fontFamily: F }}>
            {totalCount} build{totalCount !== 1 ? "s" : ""} documented
          </p>
        </div>
        <Link to="/case-files/new">
          <button style={{ padding: "10px 20px", background: BLUE, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
            + New Case File
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
            border: "1.5px solid #E5E7EB",
            borderRadius: 9,
            fontSize: 14,
            fontFamily: F,
            color: "#111827",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = "0 0 0 3px #EFF6FF"; }}
          onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF", fontFamily: F }}>Loading case files…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load. Please refresh.</div>
      ) : caseFiles.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "#fff", border: "1px solid #F0F0F0", borderRadius: 14 }}>
          <p style={{ fontSize: 16, color: "#6B7280", fontFamily: F }}>
            {filters.search ? "No results match your search." : "No case files yet. Log your first build."}
          </p>
        </div>
      ) : (
        <div>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 120px 100px 80px",
            gap: 12,
            padding: "8px 16px",
            marginBottom: 4,
          }}>
            {["Workflow", "Industry", "Logged by", "Date", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: F }}>
                {h}
              </span>
            ))}
          </div>

          {caseFiles.map((cf) => (
            <div key={cf.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 120px 100px 80px",
              gap: 12,
              alignItems: "center",
              background: "#fff",
              border: "1px solid #F0F0F0",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              transition: "border-color 0.15s",
            }}>
              {/* Workflow + tags */}
              <div style={{ minWidth: 0 }}>
                <Link to={`/case-files/${cf.id}`} style={{ textDecoration: "none" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: F }}>
                    {cf.workflow_type || "Untitled"}
                  </p>
                </Link>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {cf.tools?.slice(0, 3).map((t) => (
                    <span key={t} style={{ fontSize: 11, color: BLUE, background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "1px 7px", fontFamily: F }}>
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
              <span style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>
                {cf.industries?.[0] || "—"}
              </span>

              {/* Logged by */}
              <span style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>
                {cf.logged_by_name}
              </span>

              {/* Date */}
              <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
                {formatDate(cf.created_at)}
              </span>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <Link to={`/case-files/${cf.id}/edit`}>
                  <button style={{ padding: "5px 10px", background: "transparent", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12, color: "#6B7280", fontFamily: F, cursor: "pointer" }}>
                    Edit
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(cf.id)}
                  disabled={deleting === cf.id}
                  style={{ padding: "5px 10px", background: "transparent", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#EF4444", fontFamily: F, cursor: "pointer" }}
                >
                  {deleting === cf.id ? "…" : "Del"}
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data?.next || data?.previous ? (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
              {data.previous && (
                <button onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  style={{ padding: "8px 16px", border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", fontSize: 13, fontFamily: F, cursor: "pointer" }}>
                  ← Previous
                </button>
              )}
              {data.next && (
                <button onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  style={{ padding: "8px 16px", border: "1px solid #E5E7EB", borderRadius: 8, background: "#fff", fontSize: 13, fontFamily: F, cursor: "pointer" }}>
                  Next →
                </button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
