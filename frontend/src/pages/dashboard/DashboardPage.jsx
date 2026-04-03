import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell, Label,
} from "recharts";
import { useCaseFiles, useCaseFileStats } from "../../hooks/useCaseFiles";
import { useAuth } from "../../hooks/useAuth";
import { formatDate, satisfactionLabel } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";
const GREEN = "#059669";
const ORANGE = "#EA580C";
const AMBER = "#D97706";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function labelFromKey(key = "") {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #F0F0F0",
      borderRadius: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: F }}>{title}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: F }}>{sub}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      {[80, 65, 90, 50, 72].map((w, i) => (
        <div key={i} style={{ height: 14, background: "#F3F4F6", borderRadius: 6, width: `${w}%` }} />
      ))}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div style={{ padding: "28px 0", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 12, color: "#D1D5DB", fontFamily: F }}>{text}</p>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1F2937", color: "#F9FAFB", borderRadius: 8,
      padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>
      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, color: "#D1D5DB" }}>{payload[0].value}{unit}</p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = BLUE }) {
  return (
    <Card style={{ padding: "20px 22px" }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color, fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: "#9CA3AF", fontFamily: F }}>{sub}</p>}
    </Card>
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

// ── Horizontal bar chart wrapper ──────────────────────────────────────────────
// Generic component: data = [{name, value, ...}], barColor or colorFn

function HorizBarChart({ data, barColor, unit = "", height = 220, tickWidth = 130 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        barSize={12}
      >
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: F }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={tickWidth}
          tick={{ fontSize: 11, fill: "#6B7280", fontFamily: F }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "#F9FAFB" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={barColor} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Roadblock types chart (vertical bar) ──────────────────────────────────────

function RoadblockTypesChart({ types = [], loading }) {
  const data = types.slice(0, 7).map((rb) => ({
    name: labelFromKey(rb.type).replace(" Limitation", " Limit.").replace("Automation", "Auto."),
    fullName: labelFromKey(rb.type),
    value: rb.count,
    topTool: rb.top_tool,
  }));

  return (
    <Card style={{ padding: "20px 22px" }}>
      <CardHeader title="Top Roadblock Types" sub="Count of roadblocks per category" />
      {loading ? <Skeleton /> : data.length === 0 ? <Empty text="No roadblocks logged yet" /> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 48 }} barSize={28}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#6B7280", fontFamily: F }}
              axisLine={false}
              tickLine={false}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: F }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: "#1F2937", color: "#F9FAFB", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{d.fullName}</p>
                    <p style={{ margin: 0, color: "#D1D5DB" }}>{d.value} roadblock{d.value !== 1 ? "s" : ""}{d.topTool ? ` · top tool: ${d.topTool}` : ""}</p>
                  </div>
                );
              }}
              cursor={{ fill: "#FFF7ED" }}
            />
            <Bar dataKey="value" fill={ORANGE} radius={[6, 6, 0, 0]}>
              <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#6B7280", fontFamily: F }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// ── Scope creep chart ─────────────────────────────────────────────────────────

function ScopeCreepChart({ tools = [], loading }) {
  const data = tools.map((t) => ({ name: t.tool, value: t.count }));

  return (
    <Card style={{ padding: "20px 22px" }}>
      <CardHeader title="Scope Creep by Tool" sub="Tools most often present in diverged builds" />
      {loading ? <Skeleton /> : data.length === 0 ? <Empty text="No diverged builds recorded" /> : (
        <HorizBarChart data={data} barColor={AMBER} unit=" cases" height={Math.max(180, data.length * 36)} tickWidth={110} />
      )}
    </Card>
  );
}

// ── Satisfaction charts ───────────────────────────────────────────────────────

function SatTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div style={{
      background: "#1F2937", color: "#F9FAFB", borderRadius: 8,
      padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>
      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, color: "#D1D5DB" }}>{score} / 5 · {payload[0].payload.count} file{payload[0].payload.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function SatBarChart({ data, height = 200, tickWidth = 130 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
        barSize={12}
      >
        <XAxis
          type="number"
          domain={[0, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fontSize: 11, fill: "#9CA3AF", fontFamily: F }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={tickWidth}
          tick={{ fontSize: 11, fill: "#6B7280", fontFamily: F }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<SatTooltip />} cursor={{ fill: "#F9FAFB" }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={BLUE}>
          <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#6B7280", fontFamily: F }} formatter={(v) => `${v}/5`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#2563EB", "#059669", "#D97706", "#EA580C", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

function IndustryPieChart({ data, loading }) {
  if (loading) return <Skeleton />;
  if (!data?.length) return <Empty text="No data yet" />;

  const total = data.reduce((s, r) => s + r.count, 0);

  // Keep top 7 by count, bucket the rest into "Other"
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 7);
  const otherCount = sorted.slice(7).reduce((s, r) => s + r.count, 0);

  const pieData = [
    ...top.map((r) => ({ name: r.industry, value: r.count, avg_sat: r.avg_sat })),
    ...(otherCount > 0 ? [{ name: "Other", value: otherCount, avg_sat: null }] : []),
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {/* Donut with center label */}
      <div style={{ width: 170, height: 200, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              strokeWidth={0}
            >
              <Label
                content={({ viewBox: { cx, cy } }) => (
                  <>
                    <text x={cx} y={cy - 5} textAnchor="middle" fill="#111827" fontSize={22} fontWeight={700} fontFamily={F}>{total}</text>
                    <text x={cx} y={cy + 13} textAnchor="middle" fill="#9CA3AF" fontSize={10} fontFamily={F}>total files</text>
                  </>
                )}
              />
              {pieData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const pct = Math.round((d.value / total) * 100);
                return (
                  <div style={{ background: "#1F2937", color: "#F9FAFB", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{d.name}</p>
                    <p style={{ margin: 0, color: "#D1D5DB" }}>
                      {d.value} file{d.value !== 1 ? "s" : ""} · {pct}%
                      {d.avg_sat ? ` · avg ${d.avg_sat}/5` : ""}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Side legend */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {pieData.map((item, i) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 11, color: "#374151", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: F, whiteSpace: "nowrap" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SatisfactionPanel({ byWorkflow = [], byIndustry = [], loading }) {
  const wfData = byWorkflow.map((r) => ({ name: r.workflow_type, value: r.avg_sat, count: r.count }));

  const colStyle = { flex: 1, minWidth: 0 };
  const labelStyle = { margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <Card style={{ padding: "20px 22px" }}>
      <CardHeader title="Satisfaction Breakdown" sub="Average score (1–5) by workflow type · case file distribution by industry" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={colStyle}>
          <p style={labelStyle}>By Workflow Type</p>
          {loading ? <Skeleton /> : wfData.length === 0 ? <Empty text="No data yet" /> : (
            <SatBarChart data={wfData} height={Math.max(160, wfData.length * 36)} tickWidth={130} />
          )}
        </div>
        <div style={colStyle}>
          <p style={labelStyle}>By Industry</p>
          <IndustryPieChart data={byIndustry} loading={loading} />
        </div>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useCaseFileStats();
  const { data: recentData, isLoading: listLoading } = useCaseFiles({ page: 1 });

  const recent = recentData?.results || [];

  return (
    <div style={{ padding: "32px 32px 80px", maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>
          Good {getTimeOfDay()}, {user?.first_name || "there"}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6B7280", fontFamily: F }}>
          Here's what the knowledge base looks like today.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Total case files"
          value={statsLoading ? "—" : stats?.total_case_files ?? 0}
          sub="builds documented"
        />
        <StatCard
          label="Avg satisfaction"
          value={statsLoading ? "—" : stats?.avg_satisfaction ? `${stats.avg_satisfaction}/5` : "—"}
          sub="across all outcomes"
          color={GREEN}
        />
        <StatCard
          label="Roadblocks logged"
          value={statsLoading ? "—" : stats?.total_roadblocks ?? 0}
          sub="known failure patterns"
          color={ORANGE}
        />
        <StatCard
          label="Avg hours lost"
          value={statsLoading ? "—" : stats?.avg_roadblock_hours ? `${stats.avg_roadblock_hours}h` : "—"}
          sub="per roadblock"
          color={AMBER}
        />
      </div>

      {/* Roadblock types + Scope creep */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <RoadblockTypesChart types={stats?.roadblock_types} loading={statsLoading} />
        <ScopeCreepChart tools={stats?.scope_creep_tools} loading={statsLoading} />
      </div>

      {/* Satisfaction breakdown */}
      <div style={{ marginBottom: 28 }}>
        <SatisfactionPanel
          byWorkflow={stats?.sat_by_workflow}
          byIndustry={stats?.sat_by_industry}
          loading={statsLoading}
        />
      </div>

      {/* Top tools */}
      {stats?.top_tools?.length > 0 && (
        <Card style={{ padding: "20px 22px", marginBottom: 28 }}>
          <CardHeader title="Most common tools" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {stats.top_tools.map(({ tool, count }) => (
              <span key={tool} style={{ padding: "5px 12px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 20, fontSize: 12, color: BLUE, fontFamily: F, fontWeight: 600 }}>
                {tool} <span style={{ fontWeight: 400, color: "#93C5FD" }}>×{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Recent case files */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: F }}>Recent case files</p>
        <Link to="/case-files" style={{ fontSize: 13, color: BLUE, fontFamily: F, fontWeight: 600 }}>View all →</Link>
      </div>

      {listLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontFamily: F }}>Loading…</div>
      ) : recent.length === 0 ? (
        <Card style={{ padding: "40px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "#374151", fontFamily: F }}>No case files yet</p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: "#9CA3AF", fontFamily: F }}>Start documenting workflow builds to train the system.</p>
          <Link to="/case-files/new">
            <button style={{ padding: "10px 22px", background: BLUE, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
              Log first build
            </button>
          </Link>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recent.slice(0, 8).map((cf) => (
            <Link key={cf.id} to={`/case-files/${cf.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
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
                    {cf.name} - {cf.workflow_type || "Untitled workflow"}
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
                    <span style={{ fontSize: 12, color: ORANGE, fontFamily: F, fontWeight: 600 }}>
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
