import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@hooks/useTheme";
import { useProject, useDeleteProject, useUpdateProject, useToggleProjectStatus } from "@hooks/useProjects";
import { useBriefByProject } from "@hooks/useWorkflows";
import { formToProjectPayload, projectToFormState, briefToSuggestedAutomations } from "@utils/transforms";
import ProjectForm from "@components/ProjectForm";
import { WorkflowMapPanel } from "@components/WorkflowMapPanel";

// Detail-layer components
import CaseFileHeader  from "./detail/components/ProjectHeader";
import ShareModal      from "./detail/components/ShareModal";
import Section         from "./detail/components/Section";

// Section render blocks
import AuditSection     from "./detail/sections/AuditSection";
import IntakeSection    from "./detail/sections/IntakeSection";
import BuildSection     from "./detail/sections/BuildSection";
import DeltaSection     from "./detail/sections/DeltaSection";
import ReasoningSection from "./detail/sections/ReasoningSection";
import OutcomeSection   from "./detail/sections/OutcomeSection";

// Print layout
import PrintView from "./detail/print/PrintView";


import { F } from "./detail/constants";

// ─────────────────────────────────────────────────────────────────────────────

function ProjectUpdatesView({ projectUpdates, theme }) {
  return (
    <Section title="Project Updates" subtitle="Timestamped notes and attachments" color="#0284C7">
      {!projectUpdates?.length
        ? <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic", margin: 0 }}>No updates logged.</p>
        : <div>{projectUpdates.map((pu, i) => {
          const dateLabel = pu.created_at
            ? (() => { const [y, m, d] = pu.created_at.slice(0, 10).split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()
            : "—";
          return (
            <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                {pu.attachments?.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>
                )}
              </div>
              <div style={{ padding: "12px 14px" }}>
                {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                {pu.attachments?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {pu.attachments.map((att, ai) => att.url && (
                      <span key={ai} style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F, fontWeight: 500 }}>{att.name || att.url}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}</div>
      }
    </Section>
  );
}

function ScopeCreepView({ scopeCreep, theme }) {
  return (
    <Section title="Scope Creep" subtitle="Unplanned additions to the build" color="#D97706">
      {!scopeCreep?.length
        ? <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic", margin: 0 }}>No scope creep logged.</p>
        : <div>{scopeCreep.map((sc, i) => (
          <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
            {sc.reason && <p style={{ margin: "0 0 4px", fontSize: 12, color: theme.textSec, fontFamily: F }}><strong>Why added:</strong> {sc.reason}</p>}
            {sc.impact && <p style={{ margin: "0 0 4px", fontSize: 12, color: theme.textSec, fontFamily: F }}><strong>Impact:</strong> {sc.impact}</p>}
            {sc.communicated != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, fontFamily: F, borderRadius: 8, padding: "2px 10px",
                  color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                  background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                  border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                }}>
                  {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                </span>
              </div>
            )}
          </div>
        ))}</div>
      }
    </Section>
  );
}

const DETAIL_SECTIONS = [
  { id:"projectUpdates", label:"Project Updates",      subtitle:"Timestamped notes and attachments",              color:"#0284C7", group:"The Updates"  },
  { id:"scopeCreep",     label:"Scope Creep",           subtitle:"Unplanned additions to the build",               color:"#D97706", group:"The Updates"  },
  { id:"intake",         label:"Who's the client?",    subtitle:"Scenario, industry, team, and tools",            color:"#7C3AED", group:"The Situation" },
  { id:"audit",          label:"What's in place now?", subtitle:"Current setup and what's breaking",              color:"#7C3AED", group:"The Build"     },
  { id:"build",          label:"The Build",            subtitle:"Everything that was built",                      color:"#0284C7", group:"The Build"     },
  { id:"delta",          label:"Intent vs Reality",    subtitle:"Gap between intent and delivery",                color:"#059668", group:"The Outcome"   },
  { id:"reasoning",      label:"Decision Reasoning",   subtitle:"Reasoning behind every major decision",          color:"#059668", group:"The Outcome"   },
  { id:"outcome",        label:"Outcome",              subtitle:"Post-build result and long-term usage signal",   color:"#059668", group:"The Outcome"   },
];

export default function CaseFileDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { theme }    = useTheme();

  // ── UI state ───────────────────────────────────────────────────────────────
  const justCreated = location.state?.justCreated;
  const [showBanner,     setShowBanner]     = useState(!!justCreated);
  const [isEditing,      setIsEditing]      = useState(false);
  const [apiError,       setApiError]       = useState(null);
  const [mapWfIndex,     setMapWfIndex]     = useState(null);
  const [showShare,      setShowShare]      = useState(false);
  const [showOptions,    setShowOptions]    = useState(false);
  const [isPrinting,     setIsPrinting]     = useState(false);
  const [activeSection,  setActiveSection]  = useState(0);
  const [w,              setW]              = useState(typeof window !== "undefined" ? window.innerWidth : 900);
  const isMobile = w < 640;

  // Auto-hide success banner
  useEffect(() => {
    if (!justCreated) return;
    const t = setTimeout(() => setShowBanner(false), 3000);
    return () => clearTimeout(t);
  }, [justCreated]);

  // Track viewport width for sidebar vs. modal breakpoint
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // Listen to browser print events (used by PrintView)
  useEffect(() => {
    const onBefore = () => setIsPrinting(true);
    const onAfter  = () => setIsPrinting(false);
    window.addEventListener("beforeprint",  onBefore);
    window.addEventListener("afterprint",   onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint",  onAfter);
    };
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: cf, isLoading, isError } = useProject(id);
  const deleteMutation  = useDeleteProject();
  const updateMutation  = useUpdateProject(id);
  const statusMutation  = useToggleProjectStatus(id);
  const { data: linkedBrief } = useBriefByProject(id);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    await deleteMutation.mutateAsync(id);
    navigate("/projects");
  };

  const handleEditSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formToProjectPayload(formData, enteredBy, caseName || "");
      await updateMutation.mutateAsync(payload);
      setIsEditing(false);
    } catch (err) {
      const data = err.response?.data;
      setApiError(data ? JSON.stringify(data, null, 2) : "Save failed.");
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>
        Loading project…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p style={{ color: "#EF4444", fontFamily: F, marginBottom: 16 }}>Failed to load project.</p>
        <Link to="/projects" style={{ color: theme.blue, fontFamily: F }}>← Back to projects</Link>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing) {
    const initialData         = projectToFormState(cf);
    const suggestedAutomations = linkedBrief ? briefToSuggestedAutomations(linkedBrief) : [];
    return (
      <div>
        {apiError && (
          <div style={{ margin: "16px 32px 0", padding: "14px 18px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13, color: "#DC2626", fontFamily: F, whiteSpace: "pre-wrap" }}>
            <strong>Save failed:</strong> {apiError}
          </div>
        )}
        <ProjectForm
          initialData={initialData}
          initialName={cf.name || ""}
          initialEnteredBy={cf.logged_by_name || ""}
          onSubmit={handleEditSubmit}
          isSaving={updateMutation.isPending}
          isEditing
          onCancel={() => { setIsEditing(false); setApiError(null); }}
          suggestedAutomations={suggestedAutomations}
        />
      </div>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────
  const { audit, intake, build, delta, reasoning, outcome, project_updates } = cf;

  return (
    <>
      {/* Print media query overrides */}
      <style>{`
        .fp-print-only { display: none; }
        @media print {
          .fp-sidebar-nav { display: none !important; }
          .fp-sidebar-footer { display: none !important; }
          .fp-sidebar { position: static !important; width: auto !important; border: none !important; border-right: none !important; background: transparent !important; }
          .fp-mobile-header { display: none !important; }
          .fp-app-root { min-height: 0 !important; background: #fff !important; }
          .fp-main { margin-left: 0 !important; min-height: 0 !important; padding: 0 !important; }
          .fp-page-enter { min-height: 0 !important; }
          .fp-no-print { display: none !important; }
          .fp-print-only { display: block !important; }
          #fp-print-root { max-width: none !important; width: 100% !important; padding: 0 !important; flex: none !important; background: #fff !important; }
          .fp-section-body { display: block !important; }
          .fp-collapsible-body { display: block !important; }
          .fp-collapsible-card { overflow: visible !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 14mm 16mm; size: A4; }
        }
      `}</style>

      <div style={{ maxWidth: 1060, margin: "0 auto" }}>

        {/* ── Main content column ─────────────────────────────────────────── */}
        <div id="fp-print-root" style={{ padding: isMobile ? "20px 16px 80px" : "28px 32px 80px" }}>

          {/* Print-only: full PDF layout */}
          <div className="fp-print-only">
            <PrintView cf={cf} />
          </div>

          {/* Screen view */}
          <div className="fp-no-print">

            {/* Success banner */}
            {showBanner && (
              <div style={{ padding: "12px 16px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span style={{ fontSize: 14, color: "#065F46", fontFamily: F, fontWeight: 600, flex: 1 }}>
                  Project saved successfully. It's now part of the knowledge base.
                </span>
                <button onClick={() => setShowBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6EE7B7", lineHeight: 1, padding: 0 }}>×</button>
              </div>
            )}

            {/* Page header — unchanged */}
            <CaseFileHeader
              cf={cf}
              theme={theme}
              onEdit={() => setIsEditing(true)}
              onShare={() => setShowShare(true)}
              onDelete={handleDelete}
              onToggleStatus={() => statusMutation.mutate()}
              statusPending={statusMutation.isPending}
              deletePending={deleteMutation.isPending}
              showOptions={showOptions}
              setShowOptions={setShowOptions}
              setIsPrinting={setIsPrinting}
            />

            {/* Meta chips — unchanged */}
            <div className="fp-meta-chips" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
              {cf.industries?.map(i => (
                <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, color: theme.blue, fontFamily: F, fontWeight: 500 }}>{i}</span>
              ))}
              {cf.tools?.slice(0, 6).map(t => (
                <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: theme.surfaceAlt, border: `1px solid ${theme.borderInput}`, color: theme.textMuted, fontFamily: F }}>{t}</span>
              ))}
              {cf.process_frameworks?.slice(0, 4).map(f => (
                <span key={f} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontFamily: F }}>{f}</span>
              ))}
            </div>

            {/* ── Section nav + content ────────────────────────────────────── */}

            {/* Mobile: horizontal scrollable tabs */}
            {isMobile && (
              <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", borderBottom: `1px solid ${theme.border}`, marginBottom: 20 }}>
                {DETAIL_SECTIONS.map((s, i) => (
                  <button key={s.id} onClick={() => setActiveSection(i)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, borderBottom: i === activeSection ? `3px solid ${s.color}` : "3px solid transparent", transition: "border-color 0.2s" }}>
                    <span style={{ fontSize: 11, fontWeight: i === activeSection ? 700 : 500, color: i === activeSection ? s.color : theme.textFaint, fontFamily: F, whiteSpace: "nowrap" }}>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>

              {/* Left sidebar nav (desktop only) */}
              {!isMobile && (
                <div style={{ width: 210, flexShrink: 0, position: "sticky", top: 24, height: "calc(100vh - 48px)", overflowY: "auto", borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: "20px 0 0" }}>
                  {[...new Set(DETAIL_SECTIONS.map(s => s.group))].map(group => (
                    <div key={group} style={{ marginBottom: 8 }}>
                      <p style={{ margin: "0 0 4px", padding: "0 16px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>{group}</p>
                      {DETAIL_SECTIONS.filter(s => s.group === group).map(s => {
                        const i = DETAIL_SECTIONS.indexOf(s);
                        const active = i === activeSection;
                        return (
                          <button key={s.id} onClick={() => setActiveSection(i)}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: active ? `${s.color}10` : "transparent", border: "none", borderLeft: active ? `3px solid ${s.color}` : "3px solid transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? s.color : theme.textSec, fontFamily: F, lineHeight: 1.3 }}>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Active section content */}
              <div style={{ flex: 1, minWidth: 0, padding: isMobile ? 0 : "24px 32px 120px" }}>
                {activeSection === 0 && <ProjectUpdatesView projectUpdates={project_updates}    theme={theme} />}
                {activeSection === 1 && <ScopeCreepView    scopeCreep={delta?.scope_creep} theme={theme} />}
                {activeSection === 2 && <IntakeSection    intake={intake}       theme={theme} />}
                {activeSection === 3 && <AuditSection     audit={audit}         theme={theme} />}
                {activeSection === 4 && <BuildSection     build={build}         isPrinting={isPrinting} theme={theme} mapWfIndex={mapWfIndex} setMapWfIndex={setMapWfIndex} />}
                {activeSection === 5 && <DeltaSection     delta={delta}         theme={theme} />}
                {activeSection === 6 && <ReasoningSection reasoning={reasoning} theme={theme} />}
                {activeSection === 7 && <OutcomeSection   outcome={outcome}     theme={theme} />}
              </div>
            </div>

          </div>{/* end fp-no-print screen view */}
        </div>

        {/* ── Workflow map modal ───────────────────────────────────────────── */}
        {mapWfIndex !== null && build?.workflows?.[mapWfIndex] && (
          <WorkflowMapPanel
            workflow={build.workflows[mapWfIndex]}
            onClose={() => setMapWfIndex(null)}
            asModal
          />
        )}
      </div>

      {/* Share modal */}
      {showShare && <ShareModal cf={cf} onClose={() => setShowShare(false)} />}
    </>
  );
}
