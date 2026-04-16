import { PF } from "../constants";
import PrintSection from "./PrintSection";
import PrintRow from "./PrintRow";
import PrintTagList from "./PrintTagList";
import PrintBuildCard from "./PrintBuildCard";
import PrintRoadblockCard from "./PrintRoadblockCard";

/**
 * Full-page print layout that mirrors SharedBriefPage.
 * Rendered inside .fp-print-only, hidden from screen view.
 * Always hardcodes light-mode colors — print is always light.
 *
 * Props:
 *   cf — full case file object
 */
export default function PrintView({ cf }) {
  const { audit, intake, build, delta, reasoning, outcome, project_updates } = cf;

  return (
    <div style={{ fontFamily: PF, background: "#fff" }}>

      {/* Branded top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#111827", fontWeight: 700, letterSpacing: "-0.02em" }}>
          Flowpath
        </span>
        <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PF, background: "#F3F4F6", border: "1px solid #E5E7EB", borderRadius: 8, padding: "4px 12px" }}>
          Read-only · Client brief
        </span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 28, fontFamily: "'Fraunces', serif", color: "#111827" }}>
          {cf.name || cf.workflow_type || "Untitled workflow"}
        </h1>
        {cf.name && cf.workflow_type && (
          <p style={{ margin: "0 0 10px", fontSize: 15, color: "#6B7280", fontFamily: PF }}>{cf.workflow_type}</p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#6B7280", fontFamily: PF }}>
          {cf.logged_by_name && (
            <span>Prepared by <strong style={{ color: "#374151" }}>{cf.logged_by_name}</strong></span>
          )}
          {cf.team_size && <><span>·</span><span>{cf.team_size} team</span></>}
        </div>
      </div>

      {/* Meta chips */}
      {(cf.industries?.length > 0 || cf.tools?.length > 0 || cf.process_frameworks?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {cf.industries?.map(i => (
            <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#2563EB", fontFamily: PF, fontWeight: 500 }}>{i}</span>
          ))}
          {cf.tools?.slice(0, 6).map(t => (
            <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#6B7280", fontFamily: PF }}>{t}</span>
          ))}
          {cf.process_frameworks?.slice(0, 4).map(f => (
            <span key={f} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontFamily: PF }}>{f}</span>
          ))}
        </div>
      )}

      {/* Project Updates */}
      {project_updates?.length > 0 && (
        <PrintSection title="Project Updates" color="#0284C7">
          {[...project_updates].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).map((pu, i) => {
            const dateLabel = pu.created_at
              ? (() => { const [y, m, d] = pu.created_at.slice(0, 10).split("-"); return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); })()
              : "—";
            return (
              <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: PF }}>{dateLabel}</span>
                  {pu.attachments?.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: PF }}>📎 {pu.attachments.length}</span>
                  )}
                </div>
                <div style={{ padding: "12px 14px", background: "#fff" }}>
                  {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: PF, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                  {pu.attachments?.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pu.attachments.map((att, ai) => att.url && (
                        <span key={ai} style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: PF, fontWeight: 500 }}>
                          {att.name || att.url}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </PrintSection>
      )}

      {/* Scope Creep */}
      {delta?.scope_creep?.length > 0 && (
        <PrintSection title="Scope Creep" color="#D97706">
          {delta.scope_creep.map((sc, i) => (
            <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: PF }}>{sc.area || `Item ${i + 1}`}</p>
              {sc.reason && <PrintRow label="Why added" value={sc.reason} fullWidth />}
              {sc.impact && <PrintRow label="Impact" value={sc.impact} fullWidth />}
              {sc.communicated != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, fontFamily: PF,
                    color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                    background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                    border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                    borderRadius: 8, padding: "2px 10px",
                  }}>
                    {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </PrintSection>
      )}

      {/* Audit */}
      {audit && (audit.overall_assessment || audit.pattern_summary) && (
        <PrintSection title="What's in place now?" subtitle="Document the client's current setup and what's breaking" color="#7C3AED">
          <PrintRow label="Overall assessment" value={audit.overall_assessment} fullWidth />
          <PrintRow label="Pattern summary" value={audit.pattern_summary} fullWidth />
        </PrintSection>
      )}

      {/* Intake */}
      {intake && (intake.workflow_type || intake.team_size || intake.industries?.length > 0 || intake.tools?.length > 0 || intake.pain_points?.length > 0 || intake.process_frameworks?.length > 0 || intake.prior_attempts) && (
        <PrintSection title="Who's the client?" subtitle="Capture the scenario, industry, team, and tools" color="#7C3AED">
          <PrintRow label="Team size" value={intake.team_size} />
          <PrintRow label="Workflow type" value={intake.workflow_type} />
          {intake.industries?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
              <PrintTagList items={intake.industries} color="#2563EB" />
            </div>
          )}
          {intake.process_frameworks?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Frameworks</span>
              <PrintTagList items={intake.process_frameworks} color="#7C3AED" />
            </div>
          )}
          {intake.tools?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Tools in use</span>
              <PrintTagList items={intake.tools} color="#6B7280" />
            </div>
          )}
          {intake.pain_points?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
              <PrintTagList items={intake.pain_points} color="#7C3AED" />
            </div>
          )}
          <PrintRow label="Prior attempts" value={intake.prior_attempts} fullWidth />
        </PrintSection>
      )}

      {/* Build Documentation */}
      {(build || audit?.builds?.length > 0) && (
        <PrintSection title="Build Documentation" subtitle="Document everything that was built" color="#0284C7">
          {audit?.builds?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Builds audited ({audit.builds.length})
              </p>
              {audit.builds.map((b, i) => <PrintBuildCard key={b.id || i} build={b} index={i} />)}
            </div>
          )}
          {build?.spaces && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Spaces</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {build.spaces.split(",").map(s => s.trim()).filter(Boolean).map((s, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: PF }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {build?.workflows?.length > 0 && build.workflows.map((wf, wi) => (
            <div key={wi} style={{ border: "1px solid #BAE6FD", borderRadius: 12, marginBottom: 14, background: "#0284C710", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#0284C710" }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#0284C7", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: PF, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{wi + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: PF }}>{wf.name || `Workflow ${wi + 1}`}</span>
              </div>
              <div style={{ padding: "0 16px 14px" }}>
                {wf.notes && <p style={{ margin: "12px 0", fontSize: 13, color: "#374151", fontFamily: PF, lineHeight: 1.6, fontStyle: "italic" }}>{wf.notes}</p>}
                {wf.lists?.map((l, li) => (
                  <div key={li} style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 9, padding: "12px 14px", marginBottom: 8, background: "#fff" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      List {li + 1}{l.name ? ` — ${l.name}` : ""}
                      {l.space && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", fontFamily: PF, marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>{l.space}</span>
                      )}
                    </p>
                    <PrintRow label="Status flow" value={l.statuses} />
                    {l.custom_fields && (
                      <div style={{ padding: "8px 0", borderBottom: "1px solid #F9FAFB" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Custom fields</span>
                        <pre style={{ margin: 0, fontSize: 12, color: "#374151", fontFamily: "monospace", background: "#F3F4F6", padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{l.custom_fields}</pre>
                      </div>
                    )}
                    {Array.isArray(l.automations) && l.automations.length > 0 && (
                      <div style={{ padding: "8px 0" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Automations</span>
                        {l.automations.map((auto, ai) => {
                          const isThirdParty = (auto.platform || "clickup") === "third_party";
                          return (
                            <div key={ai} style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C780", borderRadius: 8, padding: "12px 14px", marginBottom: 8, background: "#F0F9FF" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#0284C7", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em" }}>Automation {ai + 1}</p>
                                <span style={{ fontSize: 11, fontWeight: 600, color: isThirdParty ? "#7C3AED" : "#0284C7", background: isThirdParty ? "#F5F3FF" : "#EFF6FF", border: `1px solid ${isThirdParty ? "#DDD6FE" : "#BAE6FD"}`, borderRadius: 6, padding: "2px 8px", fontFamily: PF }}>
                                  {isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp"}
                                </span>
                              </div>
                              {auto.triggers?.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.05em" }}>Triggers</span>
                                  {auto.triggers.map((t, ti) => t.type && (
                                    <div key={ti} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", fontFamily: PF, background: "#EFF6FF", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.type}</span>
                                      {t.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: PF }}>{t.detail}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {!isThirdParty && auto.actions?.length > 0 && (
                                <div style={{ marginBottom: auto.instructions ? 8 : 0 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</span>
                                  {auto.actions.map((a, ai2) => a.type && (
                                    <div key={ai2} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                                      <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: PF, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{a.type}</span>
                                      {a.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: PF }}>{a.detail}</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {auto.instructions && (
                                <div style={{ marginTop: 8 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {!isThirdParty ? "Instructions" : "Actions / Instructions"}
                                  </span>
                                  <pre style={{ margin: "4px 0 0", fontSize: 12, fontFamily: "monospace", background: "#1E1E2E", color: "#E2E8F0", padding: "10px 12px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{auto.instructions}</pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {build?.build_notes && <PrintRow label="Build notes" value={build.build_notes} fullWidth />}
        </PrintSection>
      )}

      {/* Delta */}
      {delta && (delta.user_intent || delta.success_criteria || delta.actual_build || delta.roadblocks?.length > 0) && (
        <PrintSection title="Intent vs Reality" subtitle="Log the gap between what was wanted and what was delivered" color="#059669">
          <PrintRow label="User intent" value={delta.user_intent} fullWidth />
          <PrintRow label="Success criteria" value={delta.success_criteria} fullWidth />
          <PrintRow label="What was built" value={delta.actual_build} fullWidth />
          <PrintRow label="Diverged" value={delta.diverged === true ? "Yes" : delta.diverged === false ? "No" : null} />
          <PrintRow label="Divergence reason" value={delta.divergence_reason} fullWidth />
          <PrintRow label="Compromises" value={delta.compromises} fullWidth />
          {delta.roadblocks?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                Roadblocks ({delta.roadblocks.length})
              </span>
              {delta.roadblocks.map((rb, i) => <PrintRoadblockCard key={rb.id || i} rb={rb} index={i} />)}
            </div>
          )}
        </PrintSection>
      )}

      {/* Reasoning */}
      {reasoning && (reasoning.why_structure || reasoning.alternatives || reasoning.lessons) && (
        <PrintSection title="Decision Reasoning" subtitle="Record the reasoning behind every major decision" color="#059669">
          <PrintRow label="Why this structure" value={reasoning.why_structure} fullWidth />
          <PrintRow label="Alternatives considered" value={reasoning.alternatives} fullWidth />
          <PrintRow label="Why rejected" value={reasoning.why_rejected} fullWidth />
          <PrintRow label="Assumptions made" value={reasoning.assumptions} fullWidth />
          <PrintRow label="When NOT to use" value={reasoning.when_opposite} fullWidth />
          <PrintRow label="Lessons learned" value={reasoning.lessons} fullWidth />
          {reasoning.complexity && (
            <div style={{ padding: "10px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Complexity</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${reasoning.complexity >= n ? "#059669" : "#E5E7EB"}`, background: reasoning.complexity >= n ? "#ECFDF5" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: reasoning.complexity >= n ? "#059669" : "#E5E7EB", fontSize: 11 }}>◆</span>
                  </div>
                ))}
                <span style={{ fontSize: 13, color: "#6B7280", fontFamily: PF }}>
                  {["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"][reasoning.complexity]}
                </span>
              </div>
            </div>
          )}
        </PrintSection>
      )}

      {/* Outcome */}
      {outcome && (outcome.built || outcome.what_worked || outcome.what_failed) && (
        <PrintSection title="Outcome" subtitle="Capture the post-build result and long-term usage signal" color="#059669">
          <PrintRow label="Did they build it" value={outcome.built ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1) : null} />
          <PrintRow label="Block reason" value={outcome.block_reason} fullWidth />
          <PrintRow label="What changed" value={outcome.changes} fullWidth />
          <PrintRow label="What worked" value={outcome.what_worked} fullWidth />
          <PrintRow label="What failed" value={outcome.what_failed} fullWidth />
          <PrintRow label="Revisit when" value={outcome.revisit_when} fullWidth />
          {outcome.satisfaction > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} style={{ fontSize: 20, color: outcome.satisfaction >= n ? "#F59E0B" : "#E5E7EB" }}>
                    {outcome.satisfaction >= n ? "★" : "☆"}
                  </span>
                ))}
              </div>
            </div>
          )}
          <PrintRow label="Would recommend" value={outcome.recommend ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1) : null} />
        </PrintSection>
      )}

      {/* Footer */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #E5E7EB", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#9CA3AF", fontFamily: PF }}>
          This brief was generated via <strong style={{ color: "#6B7280" }}>Flowpath</strong> · Read-only view
        </p>
      </div>
    </div>
  );
}
