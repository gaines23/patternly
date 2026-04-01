import { Link } from "react-router-dom";
import { useCaseFiles, useCaseFileStats } from "../../hooks/useCaseFiles";
import { useAuth } from "../../hooks/useAuth";
import { formatDate, truncate, satisfactionLabel } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

function StatCard({ label, value, sub, color = BLUE }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color, fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: F }}>{sub}</p>}
    </div>
  );
}

function SatisfactionDot({ score }) {
  const colors = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#10B981", 5: "#059669" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[score] || "#D1D5DB", display: "inline-block" }} />
      <span style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>{satisfactionLabel(score)}</span>
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useCaseFileStats();
  const { data: recentData, isLoading: listLoading } = useCaseFiles({ page: 1 });

  const recent = recentData?.results || [];

  return (
    <div style={{ padding: "32px 32px 80px", maxWidth: 1000 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>
          Good {getTimeOfDay()}, {user?.first_name || "there"} 👋
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6B7280", fontFamily: F }}>
          Here's what the knowledge base looks like today.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 36 }}>
        <StatCard
          label="Total case files"
          value={statsLoading ? "—" : stats?.total_case_files ?? 0}
          sub="builds documented"
        />
        <StatCard
          label="Avg satisfaction"
          value={statsLoading ? "—" : stats?.avg_satisfaction ? `${stats.avg_satisfaction}/5` : "—"}
          sub="across all outcomes"
          color="#059669"
        />
        <StatCard
          label="Roadblocks logged"
          value={statsLoading ? "—" : stats?.total_roadblocks ?? 0}
          sub="known failure patterns"
          color="#EA580C"
        />
      </div>

      {/* Top tools */}
      {stats?.top_tools?.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 12, padding: "20px 22px", marginBottom: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: F }}>Most common tools in case files</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {stats.top_tools.map(({ tool, count }) => (
              <span key={tool} style={{ padding: "5px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, fontSize: 12, color: BLUE, fontFamily: F, fontWeight: 600 }}>
                {tool} <span style={{ fontWeight: 400, color: "#93C5FD" }}>×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent case files */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: F }}>Recent case files</p>
        <Link to="/case-files" style={{ fontSize: 13, color: BLUE, fontFamily: F, fontWeight: 600 }}>View all →</Link>
      </div>

      {listLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontFamily: F }}>Loading…</div>
      ) : recent.length === 0 ? (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "#fff", border: "1px solid #F0F0F0", borderRadius: 12 }}>
          <p style={{ margin: "0 0 12px", fontSize: 20 }}>📋</p>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#374151", fontFamily: F }}>No case files yet</p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9CA3AF", fontFamily: F }}>Start documenting workflow builds to train the system.</p>
          <Link to="/case-files/new">
            <button style={{ padding: "10px 22px", background: BLUE, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
              Log first build
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recent.slice(0, 8).map((cf) => (
            <Link key={cf.id} to={`/case-files/${cf.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff",
                border: "1px solid #F0F0F0",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "border-color 0.15s, box-shadow 0.15s",
                gap: 16,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#BFDBFE"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(37,99,235,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F0F0F0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "#111827", fontFamily: F }}>
                    {cf.workflow_type || "Untitled workflow"}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: F }}>
                    {cf.industries?.slice(0, 2).join(", ") || "No industry"}
                    {" · "}
                    {cf.logged_by_name}
                    {" · "}
                    {formatDate(cf.created_at)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  {cf.roadblock_count > 0 && (
                    <span style={{ fontSize: 12, color: "#EA580C", fontFamily: F, fontWeight: 600 }}>
                      {cf.roadblock_count} roadblock{cf.roadblock_count !== 1 ? "s" : ""}
                    </span>
                  )}
                  {cf.satisfaction_score && <SatisfactionDot score={cf.satisfaction_score} />}
                  <span style={{ color: "#D1D5DB", fontSize: 16 }}>›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
