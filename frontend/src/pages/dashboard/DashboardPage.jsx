import { Link } from "react-router-dom";
import { useProjects, useProjectStats } from "@hooks/useProjects";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { formatDate } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function getDayOfWeek() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function labelFromKey(key = "") {
  return key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, style = {}, theme }) {
  return (
    <div style={{
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHead({ title, sub, right, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 20px",
      borderBottom: `1px solid ${theme.borderSubtle}`,
    }}>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>{title}</p>
        {sub && <p style={{ margin: "1px 0 0", fontSize: 11.5, color: theme.textFaint, fontFamily: F }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function CardFoot({ left, right, theme }) {
  return (
    <div style={{
      padding: "12px 20px",
      borderTop: `1px solid ${theme.borderSubtle}`,
      fontSize: 12, color: theme.textFaint, fontFamily: F,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: theme.bg,
    }}>
      <span>{left}</span>
      {right}
    </div>
  );
}

function SectionHead({ title, sub, right, theme }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "32px 0 16px" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500, fontFamily: F, letterSpacing: "-0.02em" }}>{title}</h2>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: theme.textFaint, fontFamily: F }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Eyebrow({ children, theme }) {
  return (
    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", color: theme.textFaint, fontWeight: 600, fontFamily: F, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.blue, display: "inline-block" }} />
      {children}
    </div>
  );
}

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, delta, deltaDir, theme }) {
  return (
    <div style={{
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: "16px 18px",
    }}>
      <p style={{ margin: 0, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: theme.textFaint, fontWeight: 600, fontFamily: F }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 500, fontFamily: F, letterSpacing: "-0.02em", color: theme.text }}>{value}</p>
      {sub && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: theme.textFaint, fontFamily: F }}>{sub}</p>}
      {delta && (
        <p style={{
          margin: "8px 0 0", fontSize: 11, fontFamily: "'monospace', monospace",
          color: deltaDir === "up" ? "#3F7A52" : deltaDir === "down" ? "#B0412B" : theme.textFaint,
        }}>
          {deltaDir === "up" ? "▲ " : deltaDir === "down" ? "▲ " : "— "}{delta}
        </p>
      )}
    </div>
  );
}

// ── Stacked bar rows (roadblocks) ─────────────────────────────────────────────

function StackedBarRows({ types = [], loading, theme }) {
  if (loading) return <LoadingSkeleton theme={theme} />;
  const rows = types.slice(0, 5);
  if (!rows.length) return <EmptyState text="No roadblocks logged yet" theme={theme} />;

  const toolTotals = {};
  rows.forEach(rb => rb.tools?.forEach(({ tool, count }) => { toolTotals[tool] = (toolTotals[tool] || 0) + count; }));
  const topTools = Object.entries(toolTotals).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  const COLORS = ["#6B5BD6", "#3B2F9C", "#B47A2B", "#6B6B74", "#9A9AA2"];

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(rb => {
          const total = rb.count;
          const maxCount = rows[0]?.count || 1;
          return (
            <div key={rb.type} style={{ display: "grid", gridTemplateColumns: "150px 1fr 48px", alignItems: "center", gap: 12, fontSize: 12.5 }}>
              <span style={{ color: theme.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F }}>{labelFromKey(rb.type)}</span>
              <div style={{ height: 8, background: theme.borderSubtle, borderRadius: 999, display: "flex", overflow: "hidden" }}>
                {rb.tools?.sort((a, b) => b.count - a.count).map((t, i) => {
                  const pct = (t.count / maxCount) * 100;
                  const colorIdx = topTools.indexOf(t.tool);
                  return <span key={t.tool} style={{ width: `${pct}%`, background: COLORS[colorIdx >= 0 ? colorIdx : 4], height: "100%" }} />;
                })}
              </div>
              <span style={{ fontFamily: "monospace", fontSize: 11.5, color: theme.textFaint, textAlign: "right" }}>{total}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14, fontSize: 11.5, color: theme.textFaint, fontFamily: F }}>
        {topTools.map((tool, i) => (
          <span key={tool} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 9, height: 9, borderRadius: 2, display: "inline-block", background: COLORS[i] }} />
            {tool}
          </span>
        ))}
      </div>
    </>
  );
}

// ── Satisfaction stems ────────────────────────────────────────────────────────

function SatStems({ data = [], loading, theme }) {
  if (loading) return <LoadingSkeleton theme={theme} />;
  if (!data.length) return <EmptyState text="No data yet" theme={theme} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map(r => {
        const pct = ((r.avg_sat / 5) * 100);
        return (
          <div key={r.workflow_type} style={{ display: "grid", gridTemplateColumns: "150px 1fr 50px", alignItems: "center", gap: 12, fontSize: 12.5 }}>
            <span style={{ color: theme.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: F }}>{r.workflow_type}</span>
            <div style={{ position: "relative", height: 18 }}>
              <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>
                {[0,1,2,3,4].map(i => <i key={i} style={{ borderRight: `1px dashed ${theme.borderSubtle}` }} />)}
              </div>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: theme.border }} />
              <div style={{
                position: "absolute", top: "50%", left: `${pct}%`,
                transform: "translate(-50%, -50%)",
                width: 10, height: 10, borderRadius: 999,
                background: theme.blue,
                boxShadow: `0 0 0 3px ${theme.blueLight}`,
              }} />
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 11.5, color: theme.textFaint, textAlign: "right" }}>{r.avg_sat}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tool chips ────────────────────────────────────────────────────────────────

function ToolChips({ tools = [], loading, theme }) {
  if (loading || !tools.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 8px" }}>
      {tools.map(({ tool, count }, i) => (
        <span key={tool} style={{
          display: "inline-flex", alignItems: "baseline", gap: 6,
          padding: "4px 10px", borderRadius: 999,
          background: i === 0 ? theme.blueLight : theme.surface,
          border: `1px solid ${i === 0 ? "transparent" : theme.border}`,
          fontSize: 12, fontFamily: F,
          color: i === 0 ? theme.blue : theme.textSec,
        }}>
          <b style={{ fontWeight: 600 }}>{tool}</b>
          <span style={{ fontFamily: "monospace", fontSize: 10.5, color: i === 0 ? theme.blue : theme.textFaint }}>×{count}</span>
        </span>
      ))}
    </div>
  );
}

// ── Sat bars (inline) ─────────────────────────────────────────────────────────

function SatBars({ score }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B6B74", fontFamily: F }}>
      <span>sat</span>
      <div style={{ display: "flex", gap: 2 }}>
        {[1,2,3,4,5].map(i => (
          <i key={i} style={{ width: 4, height: 11, background: i <= score ? "#6B5BD6" : "#E4E0D6", borderRadius: 1, display: "block" }} />
        ))}
      </div>
    </div>
  );
}

// ── Status tag ────────────────────────────────────────────────────────────────

function StatusTag({ status, theme }) {
  const isOpen = status !== "closed";
  return (
    <span style={{
      fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
      padding: "3px 8px", borderRadius: 4,
      background: isOpen ? theme.blueLight : "#E8F1EB",
      color: isOpen ? theme.blue : "#3F7A52",
      fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

// ── Loading / Empty ──────────────────────────────────────────────────────────

function LoadingSkeleton({ theme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
      {[80,65,90,50,72].map((w, i) => <div key={i} style={{ height: 14, background: theme.skeleton, borderRadius: 6, width: `${w}%` }} />)}
    </div>
  );
}

function EmptyState({ text, theme }) {
  return <div style={{ padding: "28px 0", textAlign: "center" }}><p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>{text}</p></div>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { data: stats, isLoading: statsLoading } = useProjectStats();
  const { data: recentData, isLoading: listLoading } = useProjects({ page: 1 });

  const recent = recentData?.results || [];
  const totalCases = stats?.total_case_files ?? 0;
  const avgSat = stats?.avg_satisfaction ?? 0;
  const totalRoadblocks = stats?.total_roadblocks ?? 0;

  // Find the lowest sat workflow for the insight footer
  const satByWf = stats?.sat_by_workflow || [];
  const lowestSat = satByWf.length > 0 ? [...satByWf].sort((a, b) => a.avg_sat - b.avg_sat)[0] : null;

  return (
    <div className="fp-page-wrap" style={{ padding: "28px 32px 80px", maxWidth: 1180 }}>

      {/* Page head */}
      <div style={{ paddingBottom: 20, marginBottom: 24, borderBottom: `1px solid ${theme.border}` }}>
        <Eyebrow theme={theme}>{getDayOfWeek()} · {getFormattedDate()}</Eyebrow>
        <h1 style={{ margin: "8px 0 4px", fontSize: 30, fontWeight: 500, fontFamily: F, letterSpacing: "-0.025em" }}>Overview</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: theme.textFaint, fontFamily: F }}>
          Good {getTimeOfDay()}, {user?.first_name || "there"}.
          {totalCases > 0 && ` You have ${totalCases} documented build${totalCases !== 1 ? "s" : ""} across the knowledge base.`}
        </p>
      </div>

      {/* Overview card — editorial + pulse */}
      <div style={{ marginBottom: 32 }}>
        <Card theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr" }}>
            {/* Left: editorial */}
            <div style={{ padding: "28px 32px" }}>
              <h1 style={{ margin: "8px 0 12px", fontSize: 32, fontWeight: 600, fontFamily: F, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                The knowledge base is <em style={{ fontStyle: "italic", color: theme.blue, fontWeight: 400 }}>catching up with reality</em>.
              </h1>
              <p style={{ margin: 0, fontSize: 14.5, color: theme.textSec, maxWidth: "52ch", lineHeight: 1.6, fontFamily: F }}>
                {totalCases > 0
                  ? `${totalCases} case files documented so far. ${totalRoadblocks > 0 ? `${totalRoadblocks} roadblocks on file — each one makes the next recommendation sharper.` : "Start logging builds to surface patterns."}`
                  : "Start documenting workflow builds to train the system."}
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <Link to="/projects/new" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "9px 16px", borderRadius: 8,
                  background: theme.text, color: theme.bg,
                  fontWeight: 600, fontSize: 13, fontFamily: F, textDecoration: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10"/></svg>
                  New Project
                </Link>
                <Link to="/projects" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 8,
                  border: `1px solid ${theme.border}`, background: theme.surface,
                  fontWeight: 600, fontSize: 13, fontFamily: F, textDecoration: "none", color: theme.textSec,
                }}>
                  My Projects
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 4l4 4-4 4"/></svg>
                </Link>
              </div>
            </div>

            {/* Right: pulse */}
            <div style={{ padding: "24px 28px", borderLeft: `1px solid ${theme.borderSubtle}`, background: theme.bg }}>
              <p style={{ margin: "0 0 14px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.12em", color: theme.textFaint, fontWeight: 600, fontFamily: F }}>This week at a glance</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <PulseRow value={statsLoading ? "—" : totalCases} label="Documented builds" sub={`across ${stats?.sat_by_industry?.length || 0} industries`} theme={theme} />
                <PulseRow value={statsLoading ? "—" : avgSat || "—"} label="Median satisfaction" sub="score out of 5, across outcomes" valueColor="#3F7A52" theme={theme} />
                <PulseRow value={statsLoading ? "—" : totalRoadblocks} label="Roadblocks on file" sub={`~${stats?.avg_roadblock_hours || 0}h lost per event`} valueColor="#B47A2B" last theme={theme} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Metrics — 4 stat cards */}
      <SectionHead title="Metrics" sub="Snapshot, last 30 days" theme={theme} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 8 }}>
        <StatCard label="Case files" value={statsLoading ? "—" : totalCases} sub="documented" theme={theme} />
        <StatCard label="Avg satisfaction" value={statsLoading ? "—" : avgSat ? `${avgSat} / 5` : "—"} sub="across all outcomes" theme={theme} />
        <StatCard label="Open roadblocks" value={statsLoading ? "—" : totalRoadblocks} sub="awaiting resolution" theme={theme} />
        <StatCard label="Avg hours lost" value={statsLoading ? "—" : stats?.avg_roadblock_hours ? `${stats.avg_roadblock_hours}h` : "—"} sub="per roadblock" theme={theme} />
      </div>

      {/* Patterns — two insight cards side by side */}
      <SectionHead title="Patterns" sub="What keeps going wrong, and what's working" theme={theme} />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 8 }}>
        {/* Roadblock patterns */}
        <Card theme={theme}>
          <CardHead title="Top roadblock patterns" sub="Stacked by tools most often implicated" theme={theme} />
          <div style={{ padding: 20 }}>
            <StackedBarRows types={stats?.roadblock_types} loading={statsLoading} theme={theme} />
          </div>
        </Card>

        {/* Satisfaction by workflow */}
        <Card theme={theme}>
          <CardHead title="Satisfaction by workflow" sub="Average outcome score, 1–5" theme={theme} />
          <div style={{ padding: 20 }}>
            <SatStems data={stats?.sat_by_workflow} loading={statsLoading} theme={theme} />
          </div>
          {lowestSat && (
            <CardFoot
              left={<>Biggest gap: <b style={{ color: theme.text, fontWeight: 600 }}>{lowestSat.workflow_type}</b> at {lowestSat.avg_sat}/5</>}
              theme={theme}
            />
          )}
        </Card>
      </div>

      {/* Tools in rotation */}
      <SectionHead
        title="Tools in rotation"
        sub={`From ${totalCases} case files — click any to filter`}
        right={<Link to="/patterns" style={{ fontSize: 12.5, color: theme.blue, fontWeight: 600, fontFamily: F, textDecoration: "none" }}>See tool report →</Link>}
        theme={theme}
      />
      <Card theme={theme}>
        <div style={{ padding: 20 }}>
          <ToolChips tools={stats?.top_tools} loading={statsLoading} theme={theme} />
        </div>
      </Card>

      {/* Recently logged */}
      <SectionHead
        title="Recently logged"
        sub={`Last ${Math.min(recent.length, 6)} case files, newest first`}
        right={<Link to="/projects" style={{ fontSize: 12.5, color: theme.blue, fontWeight: 600, fontFamily: F, textDecoration: "none" }}>All case files →</Link>}
        theme={theme}
      />
      <Card theme={theme}>
        {listLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: theme.textSec, fontFamily: F }}>No projects yet</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: theme.textFaint, fontFamily: F }}>Start documenting workflow builds to train the system.</p>
            <Link to="/projects/new">
              <button style={{ padding: "10px 22px", background: theme.text, border: "none", borderRadius: 8, color: theme.bg, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
                Log first build
              </button>
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recent.slice(0, 6).map((cf, i) => (
                <Link key={cf.id} to={`/projects/${cf.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "44px 1fr auto auto",
                      gap: 18, alignItems: "center",
                      padding: "14px 20px",
                      borderBottom: i < Math.min(recent.length, 6) - 1 ? `1px solid ${theme.borderSubtle}` : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = theme.bg}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Index */}
                    <span style={{ fontSize: 22, fontWeight: 400, color: theme.textFaint, fontFamily: F, letterSpacing: "-0.02em" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Body */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: theme.text, fontFamily: F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {cf.name}{cf.workflow_type ? <span style={{ color: theme.textFaint, fontWeight: 500 }}> — {cf.workflow_type}</span> : ""}
                      </p>
                      <div style={{ margin: "3px 0 0", fontSize: 12, color: theme.textFaint, fontFamily: F, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span>{cf.industries?.slice(0, 1).join(", ") || "—"}</span>
                        <span>·</span>
                        <span>{cf.logged_by_name}</span>
                        <span>·</span>
                        <span>{formatDate(cf.created_at)}</span>
                        {cf.tools?.slice(0, 3).map(tool => (
                          <span key={tool} style={{
                            fontFamily: "monospace", fontSize: 10.5,
                            padding: "1px 7px", border: `1px solid ${theme.border}`, borderRadius: 4,
                            background: theme.bg, color: theme.textSec,
                          }}>{tool}</span>
                        ))}
                        {cf.roadblock_count > 0 && (
                          <span style={{ color: "#B47A2B" }}>· {cf.roadblock_count} roadblock{cf.roadblock_count !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>

                    {/* Satisfaction */}
                    {cf.satisfaction_score ? <SatBars score={cf.satisfaction_score} /> : <span />}

                    {/* Status */}
                    <StatusTag status={cf.status} theme={theme} />
                  </div>
                </Link>
              ))}
            </div>
            <CardFoot
              left={`Showing ${Math.min(recent.length, 6)} of ${totalCases}`}
              right={<Link to="/projects" style={{ color: theme.blue, fontWeight: 600, fontSize: 12, fontFamily: F, textDecoration: "none" }}>View all case files →</Link>}
              theme={theme}
            />
          </>
        )}
      </Card>
    </div>
  );
}

// ── Pulse row (overview card right side) ──────────────────────────────────────

function PulseRow({ value, label, sub, valueColor, last, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "baseline", gap: 14,
      paddingBottom: last ? 0 : 12,
      borderBottom: last ? "none" : `1px dashed ${theme.borderSubtle}`,
    }}>
      <span style={{ fontFamily: F, fontWeight: 400, fontSize: 28, letterSpacing: "-0.02em", minWidth: 72, color: valueColor || theme.text }}>{value}</span>
      <div style={{ flex: 1, fontSize: 13, color: theme.textSec, fontFamily: F }}>
        {label}
        {sub && <small style={{ display: "block", color: theme.textFaint, fontSize: 11.5, marginTop: 2 }}>{sub}</small>}
      </div>
    </div>
  );
}
