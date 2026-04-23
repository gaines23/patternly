import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@hooks/useTheme";
import { useProject, useDeleteProject, useUpdateProject, useToggleProjectStatus } from "@hooks/useProjects";
import { useBriefByProject } from "@hooks/useWorkflows";
import { useTodos } from "@hooks/useTodos";
import { formToProjectPayload, projectToFormState, briefToSuggestedAutomations } from "@utils/transforms";
import ProjectForm from "@components/ProjectForm";
import DeleteConfirmModal from "@components/DeleteConfirmModal";
import { WorkflowMapPanel } from "@components/WorkflowMapPanel";

// Detail-layer components
import CaseFileHeader  from "./detail/components/ProjectHeader";
import ShareModal      from "./detail/components/ShareModal";
import Section         from "./detail/components/Section";
import EditButton      from "./detail/components/EditButton";

// Section render blocks
import AuditSection     from "./detail/sections/AuditSection";
import IntakeSection    from "./detail/sections/IntakeSection";
import BuildSection     from "./detail/sections/BuildSection";
import DeltaSection     from "./detail/sections/DeltaSection";
import ReasoningSection from "./detail/sections/ReasoningSection";
import OutcomeSection   from "./detail/sections/OutcomeSection";
import SummarySection   from "./detail/sections/SummarySection";

// Print layout
import PrintView from "./detail/print/PrintView";


import { F } from "./detail/constants";

// ─────────────────────────────────────────────────────────────────────────────

function ProjectUpdateItem({ pu }) {
  const [open, setOpen] = useState(false);
  const dateLabel = pu.created_at
    ? (() => { const [y, m, d] = pu.created_at.slice(0, 10).split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()
    : "—";
  return (
    <div style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: open ? "1px solid #BAE6FD" : "none", cursor: "pointer", userSelect: "none" }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
        {pu.attachments?.length > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 14, color: "#0284C7", display: "inline-block", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>▾</span>
      </div>
      {open && (
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
      )}
    </div>
  );
}

function ProjectUpdatesView({ projectUpdates, theme, caseFileId, projectName, preparedBy, savedUpdatesSummary, savedUpdatesGeneratedAt, onEdit }) {
  const [view, setView] = useState("notes"); // "notes" | "summary"

  const headerActions = (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setView(v => v === "notes" ? "summary" : "notes"); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 12px", borderRadius: 6, cursor: "pointer",
          background: view === "summary" ? "#8B5CF6" : "transparent",
          border: `1px solid ${view === "summary" ? "#8B5CF6" : "#8B5CF660"}`,
          color: view === "summary" ? "#fff" : "#8B5CF6",
          fontSize: 11, fontWeight: 700, fontFamily: F,
          transition: "all 0.15s",
        }}
      >
        {view === "summary" ? "← Back to Notes" : "AI Summary"}
      </button>
      {onEdit && <EditButton color="#0284C7" onClick={onEdit} />}
    </div>
  );

  return (
    <Section title="Project Updates" subtitle="Timestamped notes and attachments" color="#0284C7" headerRight={headerActions}>
      {view === "summary" ? (
        <SummarySection
          caseFileId={caseFileId}
          projectName={projectName}
          preparedBy={preparedBy}
          summaryType="updates"
          title="Project Updates Summary"
          subtitle="AI summary of updates and scope creep"
          color="#8B5CF6"
          embedded
          savedSummary={savedUpdatesSummary}
          savedGeneratedAt={savedUpdatesGeneratedAt}
        />
      ) : (
        !projectUpdates?.length
          ? <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic", margin: 0 }}>No updates logged.</p>
          : <div>{[...projectUpdates]
              .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
              .map((pu, i) => <ProjectUpdateItem key={pu.id || i} pu={pu} />)
            }</div>
      )}
    </Section>
  );
}

function ScopeCreepView({ scopeCreep, theme, onEdit }) {
  return (
    <Section title="Scope Creep" subtitle="Unplanned additions to the build" color="#D97706" headerRight={onEdit ? <EditButton color="#D97706" onClick={onEdit} /> : null}>
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
  { id:"fullSummary",     label:"Full Project Summary",   subtitle:"AI summary of the full project",                  color:"#6366F1", group:"The Updates"  },
  { id:"projectUpdates",  label:"Project Updates",       subtitle:"Timestamped notes and attachments",               color:"#0284C7", group:"The Updates"  },
  { id:"scopeCreep",      label:"Scope Creep",           subtitle:"Unplanned additions to the build",               color:"#D97706", group:"The Updates"  },
  { id:"intake",         label:"Who's the client?",    subtitle:"Scenario, industry, team, and tools",            color:"#7C3AED", group:"The Project"   },
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
  const [deleteTarget,   setDeleteTarget]   = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);
  const [editStartStep,  setEditStartStep]  = useState(0);
  const [apiError,       setApiError]       = useState(null);
  const [mapWfIndex,     setMapWfIndex]     = useState(null);
  const [showShare,      setShowShare]      = useState(false);
  const [showOptions,    setShowOptions]    = useState(false);
  const [isPrinting,     setIsPrinting]     = useState(false);
  const [activeSection,  setActiveSection]  = useState(0);
  const [w,              setW]              = useState(typeof window !== "undefined" ? window.innerWidth : 900);
  const isMobile = w < 640;

  // Refs for each section anchor
  const sectionRefs = useRef({});
  const suppressObserverUntilRef = useRef(0);

  // Offset for the sticky TopBar (54px) + a little breathing room, matches
  // the `.layer-nav { top: 80px }` pattern from the reference design.
  const STICKY_OFFSET = 80;

  // Map detail-page section id → ProjectForm step index (see SECTIONS in ProjectForm.jsx)
  const SECTION_TO_FORM_STEP = {
    projectUpdates: 0,
    scopeCreep:     1,
    audit:          2,
    intake:         3,
    build:          4,
    delta:          5,
    reasoning:      6,
    outcome:        7,
  };

  const handleEditSection = (sectionId) => {
    const stepIndex = SECTION_TO_FORM_STEP[sectionId];
    setEditStartStep(typeof stepIndex === "number" ? stepIndex : 0);
    setIsEditing(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const scrollToSection = (sectionId, index) => {
    const el = sectionRefs.current[sectionId];
    if (!el) return;
    suppressObserverUntilRef.current = Date.now() + 800;
    setActiveSection(index);
    const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  };

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

  // Track which section is currently in view (natural window scroll).
  useEffect(() => {
    const handler = () => {
      if (Date.now() < suppressObserverUntilRef.current) return;
      const viewportTop = STICKY_OFFSET + 20;
      let best = 0;
      DETAIL_SECTIONS.forEach((s, i) => {
        const el = sectionRefs.current[s.id];
        if (!el) return;
        if (el.getBoundingClientRect().top - viewportTop <= 0) best = i;
      });
      setActiveSection(best);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data: cf, isLoading, isError } = useProject(id);
  const deleteMutation  = useDeleteProject();
  const updateMutation  = useUpdateProject(id);
  const statusMutation  = useToggleProjectStatus(id);
  const { data: linkedBrief } = useBriefByProject(id);
  const { todos: caseFileTodos } = useTodos({ case_file_id: id });
  const todosByLayer = caseFileTodos.reduce((acc, t) => {
    if (t.layer_reference) {
      acc[t.layer_reference] = [...(acc[t.layer_reference] || []), t];
    }
    return acc;
  }, {});

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = () => setDeleteTarget(true);
  const confirmDelete = async () => {
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
          initialStep={editStartStep}
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

      {/* Print-only: full PDF layout (outside shell so print CSS can expand it) */}
      <div className="fp-print-only">
        <PrintView cf={cf} />
      </div>

      {/* ── App shell — single wrapper so header + layers share width/padding ── */}
      <div
        className="fp-no-print"
        style={{
          maxWidth: 1060,
          margin: "0 auto",
          padding: isMobile ? "0 16px" : "0 32px",
        }}
      >

        {showBanner && (
          <div style={{ padding: "10px 14px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, margin: "12px 0 0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, color: "#065F46", fontFamily: F, fontWeight: 600, flex: 1 }}>Project saved successfully. It's now part of the knowledge base.</span>
            <button onClick={() => setShowBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6EE7B7", lineHeight: 1, padding: 0 }}>×</button>
          </div>
        )}

        {/* Header — scrolls off naturally as the page scrolls */}
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

        {/* Mobile: horizontal section tabs */}
        {isMobile && (
          <div style={{ display: "flex", gap: 0, overflowX: "auto", scrollbarWidth: "none", borderTop: `1px solid ${theme.border}`, background: theme.bg }}>
            {DETAIL_SECTIONS.map((s, i) => (
              <button key={s.id} onClick={() => scrollToSection(s.id, i)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, borderBottom: i === activeSection ? `3px solid ${s.color}` : "3px solid transparent", transition: "border-color 0.2s" }}>
                <span style={{ fontSize: 11, fontWeight: i === activeSection ? 700 : 500, color: i === activeSection ? s.color : theme.textFaint, fontFamily: F, whiteSpace: "nowrap" }}>{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Layers row — CSS grid so nav can sit in its own column with gap,
            matching the HTML reference's `.layers { grid-template-columns: 180px 1fr; gap: 48px }`. */}
        <div
          style={{
            display: isMobile ? "block" : "grid",
            gridTemplateColumns: isMobile ? undefined : "210px 1fr",
            gap: isMobile ? undefined : 48,
            alignItems: "flex-start",
            paddingTop: isMobile ? 20 : 28,
            paddingBottom: 80,
          }}
        >

          {/* Left sidebar nav (desktop only) — sticky once it reaches top: 80px */}
          {!isMobile && (
            <nav style={{
              position: "sticky",
              top: STICKY_OFFSET,
              maxHeight: `calc(100vh - ${STICKY_OFFSET}px)`,
              overflowY: "auto",
              display: "flex", flexDirection: "column",
              paddingRight: 4,
            }}>
              {[...new Set(DETAIL_SECTIONS.map(s => s.group))].map(group => (
                <div key={group} style={{ marginBottom: 8 }}>
                  <p style={{ margin: "0 0 4px", padding: "0 12px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>{group}</p>
                  {DETAIL_SECTIONS.filter(s => s.group === group).map(s => {
                    const i = DETAIL_SECTIONS.indexOf(s);
                    const active = i === activeSection;
                    return (
                      <button key={s.id} onClick={() => scrollToSection(s.id, i)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: active ? `${s.color}10` : "transparent", border: "none", borderLeft: active ? `3px solid ${s.color}` : "3px solid transparent", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                        <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? s.color : theme.textSec, fontFamily: F, lineHeight: 1.3 }}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          )}

          {/* Content column — scrolls naturally with the page */}
          <div id="fp-print-root" style={{ minWidth: 0 }}>
            {DETAIL_SECTIONS.map((s) => {
              const setRef = (el) => { sectionRefs.current[s.id] = el; };
              let body = null;
              if (s.id === "fullSummary")    body = <SummarySection    caseFileId={id} projectName={cf.name || cf.workflow_type || "Project"} preparedBy={cf.logged_by_name} summaryType="full" title="Full Project Summary" subtitle="AI summary of the full project for reporting" color="#6366F1" workflows={build?.workflows} onOpenMap={setMapWfIndex} savedSummary={cf.full_summary} savedGeneratedAt={cf.full_summary_generated_at} />;
              if (s.id === "projectUpdates") body = <ProjectUpdatesView projectUpdates={project_updates} theme={theme} caseFileId={id} projectName={cf.name || cf.workflow_type || "Project"} preparedBy={cf.logged_by_name} savedUpdatesSummary={cf.updates_summary} savedUpdatesGeneratedAt={cf.updates_summary_generated_at} onEdit={() => handleEditSection("projectUpdates")} />;
              if (s.id === "scopeCreep")     body = <ScopeCreepView    scopeCreep={delta?.scope_creep} theme={theme} onEdit={() => handleEditSection("scopeCreep")} />;
              if (s.id === "intake")         body = <IntakeSection    intake={intake}       theme={theme} layerTodos={todosByLayer.intake    || []} onEdit={() => handleEditSection("intake")} />;
              if (s.id === "audit")          body = <AuditSection     audit={audit}         theme={theme} layerTodos={todosByLayer.audit     || []} onEdit={() => handleEditSection("audit")} />;
              if (s.id === "build")          body = <BuildSection     build={build}         isPrinting={isPrinting} theme={theme} mapWfIndex={mapWfIndex} setMapWfIndex={setMapWfIndex} layerTodos={todosByLayer.build || []} onEdit={() => handleEditSection("build")} />;
              if (s.id === "delta")          body = <DeltaSection     delta={delta}         theme={theme} layerTodos={todosByLayer.delta     || []} onEdit={() => handleEditSection("delta")} />;
              if (s.id === "reasoning")      body = <ReasoningSection reasoning={reasoning} theme={theme} layerTodos={todosByLayer.reasoning || []} onEdit={() => handleEditSection("reasoning")} />;
              if (s.id === "outcome")        body = <OutcomeSection   outcome={outcome}     theme={theme} layerTodos={todosByLayer.outcome   || []} onEdit={() => handleEditSection("outcome")} />;

              return (
                <section
                  key={s.id}
                  id={`section-${s.id}`}
                  ref={setRef}
                  style={{ scrollMarginTop: STICKY_OFFSET, marginBottom: 32 }}
                >
                  {body}
                </section>
              );
            })}
          </div>

        </div>

      </div>

      {/* ── Portals (outside shell) ──────────────────────────────────────────── */}
      {mapWfIndex !== null && build?.workflows?.[mapWfIndex] && (
        <WorkflowMapPanel
          workflow={build.workflows[mapWfIndex]}
          onClose={() => setMapWfIndex(null)}
          asModal
        />
      )}
      {showShare && <ShareModal cf={cf} onClose={() => setShowShare(false)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          name={cf.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}
