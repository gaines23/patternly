/**
 * AgentCompilerPanel.jsx
 *
 * Self-contained AI compiler panel for the Build step.
 * User enters a prompt describing what they need → AI returns 1-5
 * ranked build suggestions → user clicks "Use this build" to populate the form.
 *
 * Props:
 *   onApplyBuild(suggestion) — called when user selects a suggestion
 *   existingPrompt           — pre-fill from intake rawPrompt if available
 */
import { useState } from "react";
import { useCompileSuggestions } from "../hooks/useWorkflows";
import { useTheme } from "../hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

const EXAMPLE_PROMPTS = [
  "This workflow starts with the PM team list, once the team approves a project it needs to send the new project to the engineering team and notify them of the new project.",
  "We need a client onboarding pipeline — form submission triggers intake, then moves through scoping, proposal, and kickoff with handoffs between sales and delivery teams.",
  "This team doesn't have any real PM structure. They need a simple way to track new projects from intake through completion with basic status updates and team assignments.",
  "Our PMs need a way to see all projects assigned to them with priority and deadline visibility. We also need weekly status reports auto-generated from task progress.",
];

const COMPLEXITY_LABELS = ["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"];

function RankBadge({ rank, theme }) {
  const colors = rank === 1
    ? { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" }
    : rank <= 3
    ? { bg: "#EEEAF8", border: "#C8C2E8", text: "#7B72B8" }
    : { bg: theme.surfaceAlt, border: theme.border, text: theme.textFaint };

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px",
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 10, color: colors.text, fontFamily: F,
      flexShrink: 0,
    }}>
      #{rank}
    </span>
  );
}

function ConfidenceBadge({ score, theme }) {
  const pct = Math.round(score * 100);
  const colors = pct >= 70
    ? { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" }
    : pct >= 40
    ? { bg: "#EEEAF8", border: "#C8C2E8", text: "#7B72B8" }
    : { bg: theme.surfaceAlt, border: theme.border, text: theme.textFaint };

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px",
      background: colors.bg, border: `1px solid ${colors.border}`,
      borderRadius: 10, color: colors.text, fontFamily: F,
    }}>
      {pct}% confidence
    </span>
  );
}

function SuggestionCard({ suggestion, isSelected, onSelect, onApply, theme }) {
  const [expanded, setExpanded] = useState(false);
  const wfCount = suggestion.workflows?.length || 0;
  const listCount = (suggestion.workflows || []).reduce(
    (sum, wf) => sum + (wf.lists?.length || 0), 0
  );
  const autoCount = (suggestion.workflows || []).reduce(
    (sum, wf) => sum + (wf.lists || []).reduce(
      (s2, l) => s2 + (l.automations?.length || 0), 0
    ), 0
  );

  return (
    <div
      style={{
        border: `1.5px solid ${isSelected ? "#9B93E8" : theme.borderInput}`,
        borderRadius: 12,
        background: isSelected ? "#9B93E808" : theme.surface,
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
        cursor: "pointer",
      }}
      onClick={() => onSelect(suggestion)}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <RankBadge rank={suggestion.rank} theme={theme} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {suggestion.name}
            </p>
          </div>
          <ConfidenceBadge score={suggestion.confidence_score} theme={theme} />
        </div>

        <p style={{ margin: "0 0 10px", fontSize: 12, color: theme.textMuted, fontFamily: F, lineHeight: 1.5 }}>
          {suggestion.description}
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
          {[
            { label: "Workflows", value: wfCount },
            { label: "Lists", value: listCount },
            { label: "Automations", value: autoCount },
          ].map(({ label, value }) => (
            <span key={label} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 8,
              background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
              color: theme.textMuted, fontFamily: F,
            }}>
              {value} {label}
            </span>
          ))}
        </div>

        {/* Complexity + controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F }}>COMPLEXITY</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: `2px solid ${suggestion.estimated_complexity >= n ? "#9B93E8" : theme.borderInput}`,
                  background: suggestion.estimated_complexity >= n ? "#9B93E818" : theme.surface,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: F }}>
              {COMPLEXITY_LABELS[suggestion.estimated_complexity]}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
              style={{
                padding: "4px 10px", border: `1px solid ${theme.borderInput}`, borderRadius: 7,
                background: "transparent", fontSize: 11, color: theme.textMuted, fontFamily: F,
                cursor: "pointer",
              }}
            >
              {expanded ? "Hide details" : "See details"}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onApply(suggestion); }}
              style={{
                padding: "4px 14px", border: "none", borderRadius: 7,
                background: "#9B93E8", fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: F,
                cursor: "pointer",
              }}
            >
              Use this build
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
          {/* Reasoning */}
          {suggestion.reasoning && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#059669", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Why this approach</p>
              <p style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: F, lineHeight: 1.6 }}>{suggestion.reasoning}</p>
            </div>
          )}

          {/* Limitations */}
          {suggestion.limitations && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: "#D97706", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Limitations & tradeoffs</p>
              <p style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: F, lineHeight: 1.6 }}>{suggestion.limitations}</p>
            </div>
          )}

          {/* Workflow preview */}
          {(suggestion.workflows || []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Build preview</p>
              {suggestion.workflows.map((wf, wi) => (
                <div key={wi} style={{
                  border: `1px solid ${theme.borderInput}`, borderLeft: "3px solid #9B93E8",
                  borderRadius: 9, padding: "10px 12px", marginBottom: 6, background: theme.surface,
                }}>
                  <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#9B93E8", fontFamily: F }}>
                    {wf.name || `Workflow ${wi + 1}`}
                  </p>
                  {wf.notes && (
                    <p style={{ margin: "0 0 6px", fontSize: 11, color: theme.textMuted, fontFamily: F, fontStyle: "italic" }}>{wf.notes}</p>
                  )}
                  {(wf.lists || []).map((l, li) => (
                    <div key={li} style={{ marginLeft: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: theme.textSec, fontFamily: F }}>
                        {l.name || `List ${li + 1}`}
                      </span>
                      {l.statuses && (
                        <span style={{ fontSize: 10, color: theme.textFaint, fontFamily: F, marginLeft: 8 }}>
                          {l.statuses}
                        </span>
                      )}
                      {(l.automations || []).length > 0 && (
                        <span style={{ fontSize: 10, color: "#9B93E8", fontFamily: F, marginLeft: 8 }}>
                          {l.automations.length} automation{l.automations.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Proactive warnings */}
          {(suggestion.proactive_warnings || []).length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: "#DC2626", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Warnings</p>
              {suggestion.proactive_warnings.map((w, i) => (
                <div key={i} style={{
                  padding: "6px 10px", background: "#FEF2F2", border: "1px solid #FECACA",
                  borderRadius: 7, marginBottom: 4, fontSize: 11, color: "#DC2626", fontFamily: F,
                }}>
                  <strong>{w.tool}:</strong> {w.warning}
                  {w.workaround && <span style={{ color: "#92400E" }}> — {w.workaround}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Build notes */}
          {suggestion.build_notes && (
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Build notes</p>
              <p style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: F, lineHeight: 1.5 }}>{suggestion.build_notes}</p>
            </div>
          )}

          {/* Full-width apply button at bottom of expanded */}
          <button
            onClick={e => { e.stopPropagation(); onApply(suggestion); }}
            style={{
              width: "100%", padding: "10px 0", border: "none", borderRadius: 9,
              background: "#9B93E8", color: "#fff", fontSize: 13, fontWeight: 700,
              fontFamily: F, cursor: "pointer", marginTop: 14,
              boxShadow: "0 2px 10px rgba(155,147,232,0.35)",
            }}
          >
            Use this build
          </button>
        </div>
      )}
    </div>
  );
}

export default function AgentCompilerPanel({ onApplyBuild, existingPrompt = "" }) {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState(existingPrompt);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const compileMutation = useCompileSuggestions();

  const handleCompile = async () => {
    if (!prompt.trim() || prompt.trim().length < 20) return;
    setSuggestions(null);
    setSelectedIdx(0);
    try {
      const result = await compileMutation.mutateAsync({ rawPrompt: prompt });
      setSuggestions(result.suggestions || []);
      setCollapsed(false);
    } catch {
      // error handled via mutation state
    }
  };

  const handleApply = (suggestion) => {
    onApplyBuild(suggestion);
    setCollapsed(true);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 12, cursor: suggestions ? "pointer" : "default",
        }}
        onClick={() => suggestions && setCollapsed(c => !c)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, background: "#9B93E818", border: "1px solid #9B93E830",
            borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>
            *
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: F }}>
            Agent Compiler
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: F, color: "#9B93E8",
            background: "#9B93E818", border: "1px solid #9B93E830",
            borderRadius: 6, padding: "2px 6px", letterSpacing: "0.04em",
          }}>
            AI
          </span>
        </div>
        {suggestions && (
          <button
            onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
            style={{
              padding: "3px 10px", border: `1px solid ${theme.borderInput}`, borderRadius: 7,
              background: "transparent", fontSize: 11, color: theme.textMuted, fontFamily: F,
              cursor: "pointer",
            }}
          >
            {collapsed ? "Show compiler" : "Collapse"}
          </button>
        )}
      </div>

      {!collapsed && (
        <div style={{
          background: theme.surface, border: `1px solid ${theme.borderInput}`,
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Prompt input */}
          <div style={{
            borderBottom: suggestions ? `1px solid ${theme.border}` : "none",
          }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={"Describe what this workflow needs to do...\n\nExample: This workflow starts with the PM team list, once the team approves a project it needs to send the new project to the engineering team and notify them."}
              rows={4}
              style={{
                width: "100%", padding: "14px 16px", border: "none", outline: "none",
                fontFamily: F, fontSize: 13, color: theme.text, resize: "vertical",
                lineHeight: 1.6, boxSizing: "border-box", background: "transparent",
                borderBottom: `1px solid ${focused ? "#9B93E840" : theme.borderSubtle}`,
              }}
            />
            <div style={{
              padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{
                fontSize: 11, fontFamily: F,
                color: prompt.length < 20 ? "#EF4444" : theme.textFaint,
              }}>
                {prompt.length < 20 ? `${20 - prompt.length} more characters needed` : `${prompt.length} characters`}
              </span>
              <button
                onClick={handleCompile}
                disabled={compileMutation.isPending || prompt.trim().length < 20}
                style={{
                  padding: "8px 20px", border: "none", borderRadius: 8,
                  background: compileMutation.isPending || prompt.trim().length < 20
                    ? theme.borderInput : "#9B93E8",
                  color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: F,
                  cursor: compileMutation.isPending || prompt.trim().length < 20
                    ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {compileMutation.isPending ? "Compiling..." : "Compile build suggestions"}
              </button>
            </div>
          </div>

          {/* Loading state */}
          {compileMutation.isPending && (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              {[
                "Parsing your scenario...",
                "Retrieving knowledge base...",
                "Generating build suggestions...",
              ].map((step, i) => (
                <p key={i} style={{
                  margin: "4px 0", fontSize: 12, fontFamily: F,
                  color: i === 0 ? "#9B93E8" : theme.textFaint,
                }}>
                  {i === 0 ? "\u21BB " : "\u25CB "}{step}
                </p>
              ))}
              <p style={{ margin: "8px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                This may take 15-30 seconds
              </p>
            </div>
          )}

          {/* Error */}
          {compileMutation.isError && (
            <div style={{
              margin: "12px 16px", padding: "10px 14px", background: "#FEF2F2",
              border: "1px solid #FECACA", borderRadius: 9, fontSize: 12,
              color: "#DC2626", fontFamily: F,
            }}>
              {compileMutation.error?.response?.data?.error
                || (compileMutation.error?.response?.status === 504
                  ? "Request timed out — the AI is still generating. Try again or reduce the number of suggestions."
                  : compileMutation.error?.response?.status >= 500
                  ? "Server error. Please try again in a moment."
                  : "Compilation failed. Please try again.")}
            </div>
          )}

          {/* Example prompts (only when no suggestions yet and not loading) */}
          {!compileMutation.isPending && !suggestions && (
            <div style={{ padding: "12px 16px" }}>
              <p style={{
                margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: theme.textFaint,
                fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em",
              }}>
                Try an example
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(ex); setSuggestions(null); }}
                    style={{
                      padding: "8px 12px", background: theme.surfaceAlt,
                      border: `1px solid ${theme.borderInput}`, borderRadius: 8,
                      cursor: "pointer", textAlign: "left", fontSize: 11,
                      color: theme.textMuted, fontFamily: F, lineHeight: 1.5,
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "#9B93E8"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = theme.borderInput}
                  >
                    {ex.length > 120 ? ex.slice(0, 120) + "\u2026" : ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestion cards */}
          {suggestions && suggestions.length > 0 && (
            <div style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#9B93E8", fontFamily: F }}>
                  {suggestions.length} build suggestion{suggestions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {suggestions.map((s, i) => (
                  <SuggestionCard
                    key={i}
                    suggestion={s}
                    isSelected={i === selectedIdx}
                    onSelect={() => setSelectedIdx(i)}
                    onApply={handleApply}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {suggestions && suggestions.length === 0 && (
            <div style={{
              padding: "20px 16px", textAlign: "center",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>
                No suggestions generated
              </p>
              <p style={{ margin: 0, fontSize: 12, color: theme.textMuted, fontFamily: F }}>
                Try describing your workflow needs in more detail.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Applied confirmation */}
      {collapsed && suggestions && (
        <div style={{
          padding: "10px 14px", background: "#ECFDF5", border: "1px solid #6EE7B7",
          borderRadius: 10, fontSize: 12, color: "#059669", fontFamily: F,
        }}>
          Build populated from AI suggestion. Edit the workflows below to customize.
        </div>
      )}
    </div>
  );
}
