import { F } from "../constants";
import Section from "../components/Section";
import CollapsibleCard from "../components/CollapsibleCard";
import DetailRow from "../components/DetailRow";
import ViewAutoCard from "../components/ViewAutoCard";
import EditButton from "../components/EditButton";
import PromoteToLibraryButton from "../../../library/PromoteToLibraryButton";

/**
 * Layer 3 — Build Documentation
 *
 * The largest section: spaces, workflows, lists, and automations.
 * Note: audited builds are now rendered inside AuditSection;
 * this section handles the new-build workflow/list/automation tree.
 *
 * Props:
 *   build          — cf.build object
 *   isPrinting     — force all collapsibles open during print
 *   theme          — theme object from useTheme()
 *   mapWfIndex     — currently-selected workflow index for the map panel (or null)
 *   setMapWfIndex  — setter to toggle the workflow map
 */
export default function BuildSection({ build, isPrinting, theme, mapWfIndex, setMapWfIndex, layerTodos = [], onEdit, caseFileId }) {
  if (!build) return null;

  return (
    <Section
      title="Build Documentation"
      subtitle="Document everything that was built"
      color="#0284C7"
      layerTodos={layerTodos}
      headerRight={onEdit ? <EditButton color="#0284C7" onClick={onEdit} /> : null}
    >
      {/* Spaces */}
      {build.spaces && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Spaces</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {build.spaces.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
              <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Workflows */}
      {build.workflows?.length > 0
        ? build.workflows.map((wf, wi) => (
            <CollapsibleCard
              key={wi}
              title={wf.name || `Workflow ${wi + 1}`}
              badge={
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#0284C7", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: F, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {wi + 1}
                </span>
              }
              forceOpen={isPrinting}
              action={
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {caseFileId && (
                    <PromoteToLibraryButton
                      caseFileId={caseFileId}
                      sourceLayer="build.workflows"
                      sourcePath={`build.workflows[${wi}]`}
                      suggestedKind="template"
                      suggestedName={wf.name ? `${wf.name} — Template` : `Workflow ${wi + 1} Template`}
                      suggestedBody={{
                        summary: wf.notes || "",
                        steps: (wf.lists || []).map((l, idx) => `${idx + 1}. ${l.name || "List"}${l.statuses ? ` — statuses: ${l.statuses}` : ""}`).join("\n"),
                      }}
                      suggestedTags={[wf.name].filter(Boolean)}
                      label="↑ Save workflow"
                    />
                  )}
                  <button
                    onClick={() => setMapWfIndex(mapWfIndex === wi ? null : wi)}
                    style={{
                      fontSize: 11, fontWeight: 600, fontFamily: F,
                      color: mapWfIndex === wi ? "#fff" : "#0284C7",
                      background: mapWfIndex === wi ? "#0284C7" : "#E0F2FE",
                      border: "1px solid #BAE6FD",
                      borderRadius: 6, padding: "3px 10px",
                      cursor: "pointer", lineHeight: 1.4,
                    }}
                  >
                    {mapWfIndex === wi ? "✕ Map" : "Map ↗"}
                  </button>
                </div>
              }
            >
              {wf.notes && (
                <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.6, fontStyle: "italic" }}>{wf.notes}</p>
              )}

              {wf.lists?.length > 0 && wf.lists.map((l, li) => (
                <div key={li} style={{ border: `1px solid ${theme.borderInput}`, borderLeft: "3px solid #0284C7", borderRadius: 9, padding: "12px 14px", marginBottom: 8, background: theme.surface }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      List {li + 1}{l.name ? ` — ${l.name}` : ""}
                    </p>
                    {l.space && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", fontFamily: F }}>
                        {l.space}
                      </span>
                    )}
                  </div>

                  <DetailRow label="Status flow" value={l.statuses} />

                  {l.custom_fields && (
                    <div style={{ padding: "8px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom fields</span>
                        {caseFileId && (
                          <PromoteToLibraryButton
                            caseFileId={caseFileId}
                            sourceLayer="build.custom_fields"
                            sourcePath={`build.workflows[${wi}].lists[${li}].custom_fields`}
                            suggestedKind="custom_field_set"
                            suggestedName={l.name ? `${l.name} — Custom Fields` : `Custom Fields ${li + 1}`}
                            suggestedBody={{ fields_text: l.custom_fields }}
                            suggestedTags={[wf.name, l.name].filter(Boolean)}
                          />
                        )}
                      </div>
                      <pre style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: "monospace", background: theme.surfaceAlt, padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                        {l.custom_fields}
                      </pre>
                    </div>
                  )}

                  {Array.isArray(l.automations) && l.automations.length > 0 && (() => {
                    const pipeline = l.automations.map((a, i) => ({ a, i })).filter(({ a }) => (a.automation_mode || "pipeline") !== "standalone");
                    const standalone = l.automations.map((a, i) => ({ a, i })).filter(({ a }) => a.automation_mode === "standalone");
                    const hasMix = pipeline.length > 0 && standalone.length > 0;
                    const sourcePathFor = (i) => `build.workflows[${wi}].lists[${li}].automations[${i}]`;
                    const cardProps = {
                      caseFileId, listName: l.name, workflowName: wf.name,
                    };

                    return (
                      <div style={{ padding: "8px 0" }}>
                        {hasMix ? (
                          <>
                            {pipeline.length > 0 && (
                              <div style={{ marginBottom: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0284C7" }} />
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pipeline</span>
                                </div>
                                <div style={{ borderLeft: "2px dashed #BAE6FD", paddingLeft: 12 }}>
                                  {pipeline.map(({ a, i }) => (
                                    <ViewAutoCard key={i} auto={a} autoIdx={i} forceOpen={isPrinting}
                                      sourcePath={sourcePathFor(i)} {...cardProps} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {standalone.length > 0 && (
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: 2, background: "#D97706" }} />
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Standalone</span>
                                </div>
                                {standalone.map(({ a, i }) => (
                                  <ViewAutoCard key={i} auto={a} autoIdx={i} forceOpen={isPrinting}
                                    sourcePath={sourcePathFor(i)} {...cardProps} />
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                {standalone.length > 0 ? "Standalone agent automations" : "Agent automations"}
                              </span>
                            </div>
                            {l.automations.map((auto, ai) => (
                              <ViewAutoCard key={ai} auto={auto} autoIdx={ai} forceOpen={isPrinting}
                                sourcePath={sourcePathFor(ai)} {...cardProps} />
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </CollapsibleCard>
          ))
        : <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic" }}>No workflows documented.</p>
      }

      <DetailRow label="Build notes" value={build.build_notes} fullWidth />
    </Section>
  );
}
