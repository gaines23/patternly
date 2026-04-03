import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Legend,
  PieChart, Pie, Cell, Label,
} from "recharts";
import { useCaseFiles, useCaseFileStats } from "../../hooks/useCaseFiles";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { formatDate, satisfactionLabel } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";
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

function Card({ children, style = {}, theme }) {
  return (
    <div style={{
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ title, sub, theme }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.textSec, fontFamily: F }}>{title}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>{sub}</p>}
    </div>
  );
}

function Skeleton({ theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      {[80, 65, 90, 50, 72].map((w, i) => (
        <div key={i} style={{ height: 14, background: theme.skeleton, borderRadius: 6, width: `${w}%` }} />
      ))}
    </div>
  );
}

function Empty({ text, theme }) {
  return (
    <div style={{ padding: "28px 0", textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: 12, color: theme.borderInput, fontFamily: F }}>{text}</p>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, unit = "", theme }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.tooltipBg, color: theme.tooltipText, borderRadius: 8,
      padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>
      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, color: theme.tooltipSub }}>{payload[0].value}{unit}</p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, theme }) {
  return (
    <Card style={{ padding: "20px 22px" }} theme={theme}>
      <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
      <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 700, color: color || theme.blue, fontFamily: "'Fraunces', serif", letterSpacing: "-0.02em" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>{sub}</p>}
    </Card>
  );
}

function SatisfactionDot({ score, theme }) {
  const colors = { 1: "#EF4444", 2: "#F97316", 3: "#F59E0B", 4: "#10B981", 5: "#059669" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[score] || theme.skeleton, display: "inline-block" }} />
      <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{satisfactionLabel(score)}</span>
    </span>
  );
}

// ── Horizontal bar chart wrapper ──────────────────────────────────────────────

function HorizBarChart({ data, barColor, unit = "", height = 220, tickWidth = 130, theme }) {
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
          tick={{ fontSize: 11, fill: theme.textFaint, fontFamily: F }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={tickWidth}
          tick={{ fontSize: 11, fill: theme.textMuted, fontFamily: F }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip unit={unit} theme={theme} />} cursor={{ fill: theme.chartCursor }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={barColor} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Roadblock types stacked bar chart ────────────────────────────────────────

function RoadblockTypesChart({ types = [], loading, theme }) {
  const rows = types.slice(0, 7);

  const toolTotals = {};
  rows.forEach((rb) => rb.tools?.forEach(({ tool, count }) => {
    toolTotals[tool] = (toolTotals[tool] || 0) + count;
  }));
  const topTools = Object.entries(toolTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([tool]) => tool);

  const data = rows.map((rb) => {
    const row = { name: labelFromKey(rb.type) };
    let other = 0;
    rb.tools?.forEach(({ tool, count }) => {
      if (topTools.includes(tool)) row[tool] = count;
      else other += count;
    });
    if (other > 0) row["Other"] = other;
    return row;
  });

  const allKeys = [...topTools, ...(data.some((r) => r["Other"]) ? ["Other"] : [])];
  const COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#DB2777", "#65A30D", "#9CA3AF"];
  const tickWidth = 148;

  return (
    <Card style={{ padding: "20px 22px" }} theme={theme}>
      <CardHeader title="Top Roadblock Types" sub="Stacked by tools affected" theme={theme} />
      {loading ? <Skeleton theme={theme} /> : data.length === 0 ? <Empty text="No roadblocks logged yet" theme={theme} /> : (
        <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 42 + 40)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barSize={16}
          >
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: theme.textFaint, fontFamily: F }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={tickWidth}
              tick={{ fontSize: 11, fill: theme.textMuted, fontFamily: F }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ background: theme.tooltipBg, color: theme.tooltipText, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 700 }}>{label}</p>
                    {[...payload].reverse().map((p) => (
                      <p key={p.dataKey} style={{ margin: "2px 0", color: theme.tooltipSub }}>
                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: p.fill, marginRight: 6 }} />
                        {p.dataKey}: {p.value}
                      </p>
                    ))}
                  </div>
                );
              }}
              cursor={{ fill: theme.chartCursor }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: F }}>{value}</span>}
            />
            {allKeys.map((tool, i) => (
              <Bar
                key={tool}
                dataKey={tool}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
                radius={i === allKeys.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

// ── Scope creep chart ─────────────────────────────────────────────────────────

function ScopeCreepChart({ tools = [], loading, theme }) {
  const data = tools.map((t) => ({ name: t.tool, value: t.count }));

  return (
    <Card style={{ padding: "20px 22px" }} theme={theme}>
      <CardHeader title="Scope Creep by Tool" sub="Tools most often present in diverged builds" theme={theme} />
      {loading ? <Skeleton theme={theme} /> : data.length === 0 ? <Empty text="No diverged builds recorded" theme={theme} /> : (
        <HorizBarChart data={data} barColor={AMBER} unit=" cases" height={Math.max(180, data.length * 36)} tickWidth={110} theme={theme} />
      )}
    </Card>
  );
}

// ── Satisfaction charts ───────────────────────────────────────────────────────

function SatTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div style={{
      background: theme.tooltipBg, color: theme.tooltipText, borderRadius: 8,
      padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>
      <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, color: theme.tooltipSub }}>{score} / 5 · {payload[0].payload.count} file{payload[0].payload.count !== 1 ? "s" : ""}</p>
    </div>
  );
}

function SatBarChart({ data, height = 200, tickWidth = 130, theme }) {
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
          tick={{ fontSize: 11, fill: theme.textFaint, fontFamily: F }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={tickWidth}
          tick={{ fontSize: 11, fill: theme.textMuted, fontFamily: F }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<SatTooltip theme={theme} />} cursor={{ fill: theme.chartCursor }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={theme.blue}>
          <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: theme.textMuted, fontFamily: F }} formatter={(v) => `${v}/5`} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#2563EB", "#059669", "#D97706", "#EA580C", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];

function IndustryPieChart({ data, loading, theme }) {
  if (loading) return <Skeleton theme={theme} />;
  if (!data?.length) return <Empty text="No data yet" theme={theme} />;

  const total = data.reduce((s, r) => s + r.count, 0);

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 7);
  const otherCount = sorted.slice(7).reduce((s, r) => s + r.count, 0);

  const pieData = [
    ...top.map((r) => ({ name: r.industry, value: r.count, avg_sat: r.avg_sat })),
    ...(otherCount > 0 ? [{ name: "Other", value: otherCount, avg_sat: null }] : []),
  ];

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
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
                    <text x={cx} y={cy - 5} textAnchor="middle" fill={theme.text} fontSize={22} fontWeight={700} fontFamily={F}>{total}</text>
                    <text x={cx} y={cy + 13} textAnchor="middle" fill={theme.textFaint} fontSize={10} fontFamily={F}>total files</text>
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
                  <div style={{ background: theme.tooltipBg, color: theme.tooltipText, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: F, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700 }}>{d.name}</p>
                    <p style={{ margin: 0, color: theme.tooltipSub }}>
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

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        {pieData.map((item, i) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 11, color: theme.textSec, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.name}
              </span>
              <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F, whiteSpace: "nowrap" }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SatisfactionPanel({ byWorkflow = [], byIndustry = [], loading, theme }) {
  const wfData = byWorkflow.map((r) => ({ name: r.workflow_type, value: r.avg_sat, count: r.count }));

  const colStyle = { flex: 1, minWidth: 0 };
  const labelStyle = { margin: "0 0 14px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <Card style={{ padding: "20px 22px" }} theme={theme}>
      <CardHeader title="Satisfaction Breakdown" sub="Average score (1–5) by workflow type · case file distribution by industry" theme={theme} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
        <div style={colStyle}>
          <p style={labelStyle}>By Workflow Type</p>
          {loading ? <Skeleton theme={theme} /> : wfData.length === 0 ? <Empty text="No data yet" theme={theme} /> : (
            <SatBarChart data={wfData} height={Math.max(160, wfData.length * 36)} tickWidth={130} theme={theme} />
          )}
        </div>
        <div style={colStyle}>
          <p style={labelStyle}>By Industry</p>
          <IndustryPieChart data={byIndustry} loading={loading} theme={theme} />
        </div>
      </div>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
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
        <p style={{ margin: 0, fontSize: 14, color: theme.textMuted, fontFamily: F }}>
          Here's what the knowledge base looks like today.
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total case files" value={statsLoading ? "—" : stats?.total_case_files ?? 0} sub="builds documented" theme={theme} />
        <StatCard label="Avg satisfaction" value={statsLoading ? "—" : stats?.avg_satisfaction ? `${stats.avg_satisfaction}/5` : "—"} sub="across all outcomes" color={GREEN} theme={theme} />
        <StatCard label="Roadblocks logged" value={statsLoading ? "—" : stats?.total_roadblocks ?? 0} sub="known failure patterns" color={ORANGE} theme={theme} />
        <StatCard label="Avg hours lost" value={statsLoading ? "—" : stats?.avg_roadblock_hours ? `${stats.avg_roadblock_hours}h` : "—"} sub="per roadblock" color={AMBER} theme={theme} />
      </div>

      {/* Roadblock types + Scope creep */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <RoadblockTypesChart types={stats?.roadblock_types} loading={statsLoading} theme={theme} />
        <ScopeCreepChart tools={stats?.scope_creep_tools} loading={statsLoading} theme={theme} />
      </div>

      {/* Satisfaction breakdown */}
      <div style={{ marginBottom: 28 }}>
        <SatisfactionPanel
          byWorkflow={stats?.sat_by_workflow}
          byIndustry={stats?.sat_by_industry}
          loading={statsLoading}
          theme={theme}
        />
      </div>

      {/* Top tools */}
      {stats?.top_tools?.length > 0 && (
        <Card style={{ padding: "20px 22px", marginBottom: 28 }} theme={theme}>
          <CardHeader title="Most common tools" theme={theme} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {stats.top_tools.map(({ tool, count }) => (
              <span key={tool} style={{ padding: "5px 12px", background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 20, fontSize: 12, color: theme.blue, fontFamily: F, fontWeight: 600 }}>
                {tool} <span style={{ fontWeight: 400, color: theme.blueSubtle }}>×{count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Recent case files */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: F }}>Recent case files</p>
        <Link to="/case-files" style={{ fontSize: 13, color: theme.blue, fontFamily: F, fontWeight: 600 }}>View all →</Link>
      </div>

      {listLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading…</div>
      ) : recent.length === 0 ? (
        <Card style={{ padding: "40px 20px", textAlign: "center" }} theme={theme}>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: theme.textSec, fontFamily: F }}>No case files yet</p>
          <p style={{ margin: "0 0 20px", fontSize: 13, color: theme.textFaint, fontFamily: F }}>Start documenting workflow builds to train the system.</p>
          <Link to="/case-files/new">
            <button style={{ padding: "10px 22px", background: theme.blue, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
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
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  gap: 16,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.blueBorder; e.currentTarget.style.boxShadow = `0 2px 8px rgba(37,99,235,0.08)`; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>
                    {cf.name} - {cf.workflow_type || "Untitled workflow"}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>
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
                  {cf.satisfaction_score && <SatisfactionDot score={cf.satisfaction_score} theme={theme} />}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 10,
                    background: cf.status === "closed" ? "#ECFDF5" : "#EFF6FF",
                    border: `1px solid ${cf.status === "closed" ? "#6EE7B7" : "#BFDBFE"}`,
                    color: cf.status === "closed" ? "#065F46" : "#1D4ED8",
                    fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                  }}>
                    {cf.status === "closed" ? "Closed" : "Open"}
                  </span>
                  <span style={{ color: theme.borderInput, fontSize: 16 }}>›</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
