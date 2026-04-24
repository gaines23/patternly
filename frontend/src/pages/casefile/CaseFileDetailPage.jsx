import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "@hooks/useTheme";
import { useCaseFile, useDeleteCaseFile, useUpdateCaseFile, useToggleCaseFileStatus } from "@hooks/useCaseFiles";
import { useBriefByCaseFile } from "@hooks/useWorkflows";
import { useTodos } from "@hooks/useTodos";
import { formStateToCaseFilePayload, caseFileToFormState, briefToSuggestedAutomations, formatMinutes, totalUpdatesDuration } from "@utils/transforms";
import CaseFileForm from "@components/CaseFileForm";
import DeleteConfirmModal from "@components/DeleteConfirmModal";
import { WorkflowMapPanel } from "@components/WorkflowMapPanel";

// Detail-layer components
import CaseFileHeader  from "./detail/components/CaseFileHeader";
import CaseFileSidebar from "./detail/components/CaseFileSidebar";
import ShareModal      from "./detail/components/ShareModal";

// Section render blocks
import AuditSection     from "./detail/sections/AuditSection";
import IntakeSection    from "./detail/sections/IntakeSection";
import BuildSection     from "./detail/sections/BuildSection";
import DeltaSection     from "./detail/sections/DeltaSection";
import ReasoningSection from "./detail/sections/ReasoningSection";
import OutcomeSection   from "./detail/sections/OutcomeSection";

// Print layout
import PrintView from "./detail/print/PrintView";

// Inline print-only section (for Project Updates & Scope Creep at top of screen print)
import Section    from "./detail/components/Section";
import DetailRow  from "./detail/components/DetailRow";

import { F } from "./detail/constants";

// ─────────────────────────────────────────────────────────────────────────────

export default function CaseFileDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const { theme }    = useTheme();

  // ── UI state ───────────────────────────────────────────────────────────────
  const justCreated = location.state?.justCreated;
  const [showBanner,   setShowBanner]   = useState(!!justCreated);
  const [isEditing,    setIsEditing]    = useState(false);
  const [apiError,     setApiError]     = useState(null);
  const [mapWfIndex,   setMapWfIndex]   = useState(null);
  const [showShare,    setShowShare]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [showOptions,  setShowOptions]  = useState(false);
  const [isPrinting,   setIsPrinting]   = useState(false);
  const [w,            setW]            = useState(typeof window !== "undefined" ? window.innerWidth : 900);

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
  const { data: cf, isLoading, isError } = useCaseFile(id);
  const deleteMutation  = useDeleteCaseFile();
  const updateMutation  = useUpdateCaseFile(id);
  const statusMutation  = useToggleCaseFileStatus(id);
  const { data: linkedBrief } = useBriefByCaseFile(id);
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
    navigate("/case-files");
  };

  const handleEditSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formStateToCaseFilePayload(formData, enteredBy, caseName || "");
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
        Loading case file…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p style={{ color: "#EF4444", fontFamily: F, marginBottom: 16 }}>Failed to load case file.</p>
        <Link to="/case-files" style={{ color: theme.blue, fontFamily: F }}>← Back to case files</Link>
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (isEditing) {
    const initialData         = caseFileToFormState(cf);
    const suggestedAutomations = linkedBrief ? briefToSuggestedAutomations(linkedBrief) : [];
    return (
      <div>
        {apiError && (
          <div style={{ margin: "16px 32px 0", padding: "14px 18px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, fontSize: 13, color: "#DC2626", fontFamily: F, whiteSpace: "pre-wrap" }}>
            <strong>Save failed:</strong> {apiError}
          </div>
        )}
        <CaseFileForm
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

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ── Main content column ─────────────────────────────────────────── */}
        <div id="fp-print-root" style={{ flex: 1, minWidth: 0, maxWidth: 780, padding: "28px 32px 80px" }}>

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
                  Case file saved successfully. It's now part of the knowledge base.
                </span>
                <button onClick={() => setShowBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6EE7B7", lineHeight: 1, padding: 0 }}>×</button>
              </div>
            )}

            {/* Page header */}
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

            {/* Meta chips */}
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

            {/* Print-only: Project Updates + Scope Creep (screen sections are in sidebar) */}
            <div className="fp-print-only">
              {project_updates?.length > 0 && (
                <Section
                  title="Project Updates"
                  subtitle={totalUpdatesDuration(project_updates) ? `Total time spent: ${totalUpdatesDuration(project_updates)}` : null}
                  color="#0284C7"
                >
                  {project_updates.map((pu, i) => {
                    const dateLabel = pu.created_at
                      ? (() => { const [y, m, d] = pu.created_at.slice(0, 10).split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()
                      : "—";
                    const durationLabel = formatMinutes(pu.minutes_spent);
                    return (
                      <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                          {durationLabel && <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>⏱ {durationLabel}</span>}
                          {pu.attachments?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>}
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
                  })}
                </Section>
              )}
              {delta?.scope_creep?.length > 0 && (
                <Section title="Scope Creep" color="#D97706">
                  {delta.scope_creep.map((sc, i) => (
                    <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
                      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
                      {sc.reason && <DetailRow label="Why added" value={sc.reason} fullWidth />}
                      {sc.impact && <DetailRow label="Impact" value={sc.impact} fullWidth />}
                      {sc.communicated != null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F, color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706", background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7", border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`, borderRadius: 8, padding: "2px 10px" }}>
                            {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </Section>
              )}
            </div>

            {/* ── Six data layers ──────────────────────────────────────────── */}
            <AuditSection     audit={audit}         isPrinting={isPrinting} theme={theme} layerTodos={todosByLayer.audit        || []} />
            <IntakeSection    intake={intake}        isPrinting={isPrinting} theme={theme} layerTodos={todosByLayer.intake       || []} />
            <BuildSection     build={build}          isPrinting={isPrinting} theme={theme} mapWfIndex={mapWfIndex} setMapWfIndex={setMapWfIndex} layerTodos={todosByLayer.build || []} />
            <DeltaSection     delta={delta}          isPrinting={isPrinting} theme={theme} layerTodos={todosByLayer.delta        || []} />
            <ReasoningSection reasoning={reasoning}  isPrinting={isPrinting} theme={theme} layerTodos={todosByLayer.reasoning    || []} />
            <OutcomeSection   outcome={outcome}      isPrinting={isPrinting} theme={theme} layerTodos={todosByLayer.outcome      || []} />

          </div>{/* end fp-no-print screen view */}
        </div>

        {/* ── Workflow map — narrow screen modal (< 1300px) ──────────────── */}
        {mapWfIndex !== null && w < 1300 && build?.workflows?.[mapWfIndex] && (
          <WorkflowMapPanel
            workflow={build.workflows[mapWfIndex]}
            onClose={() => setMapWfIndex(null)}
            asModal
          />
        )}

        {/* ── Right sidebar (>= 1300px) ─────────────────────────────────── */}
        {w >= 1300 && (
          <div
            className="fp-no-print"
            style={{ width: 480, flexShrink: 0, position: "sticky", top: 24, paddingTop: 28, paddingBottom: 24, maxHeight: "calc(100vh - 48px)", overflowY: mapWfIndex !== null ? "hidden" : "auto" }}
          >
            {mapWfIndex !== null && build?.workflows?.[mapWfIndex]
              ? (
                  <WorkflowMapPanel
                    workflow={build.workflows[mapWfIndex]}
                    onClose={() => setMapWfIndex(null)}
                  />
                )
              : <CaseFileSidebar cf={cf} theme={theme} />
            }
          </div>
        )}
      </div>

      {/* Share modal */}
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
