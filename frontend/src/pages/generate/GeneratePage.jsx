import { useState } from "react";
import { Link } from "react-router-dom";
import { useGenerateBrief, useGeneratedBriefs } from "../../hooks/useWorkflows";
import { useTheme } from "../../hooks/useTheme";
import { formatDate } from "../../utils/transforms";

const F = "'Plus Jakarta Sans', sans-serif";

const EXAMPLE_PROMPTS = [
  "We're a 9-person marketing agency managing 15 clients. We use Slack and HubSpot but nothing syncs. Deliverables fall through the cracks every week.",
  "12-person SaaS engineering team migrating from Linear to ClickUp. Need sprint tracking with GitHub PR integration and velocity reports.",
  "Boutique consulting firm, 6 consultants. New client onboarding takes 3 weeks and is tracked in email threads. Need a standardised process.",
  "DTC brand producing 40+ content pieces per month. Currently in Airtable but team finds it too database-y. Need a content calendar that shows what's in production.",
];

function RecommendationPanel({ brief, theme }) {
  const rec = brief.recommendation;
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [rating, setRating] = useState(0);

  const sections = [
    { label: "Spaces", value: rec.spaces, mono: false },
    { label: "Lists", value: rec.lists, mono: false },
    { label: "Status Flow", value: rec.statuses, mono: false },
    { label: "Custom Fields", value: rec.custom_fields, mono: true },
    { label: "Automations", value: rec.automations, mono: true },
    { label: "Build Notes", value: rec.build_notes, mono: false },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.blue, fontFamily: F }}>
              Recommendation ready
            </span>
            {brief.confidence_score && (
              <span style={{ fontSize: 11, padding: "2px 8px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, color: "#059669", fontFamily: F, fontWeight: 600 }}>
                {Math.round(brief.confidence_score * 100)}% confidence
              </span>
            )}
          </div>
          {brief.source_case_file_ids?.length > 0 && (
            <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>
              Based on {brief.source_case_file_ids.length} similar past build{brief.source_case_file_ids.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link to="/case-files/new">
          <button style={{ padding: "9px 18px", background: theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
            Log this as a case file →
          </button>
        </Link>
      </div>

      {/* Proactive warnings */}
      {brief.proactive_warnings?.length > 0 && (
        <div style={{ padding: "14px 16px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, marginBottom: 20 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#EA580C", fontFamily: F }}>
            ⚠️ Known issues with this tool stack
          </p>
          {brief.proactive_warnings.map((w, i) => (
            <div key={i} style={{ marginBottom: i < brief.proactive_warnings.length - 1 ? 10 : 0 }}>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#92400E", fontFamily: F }}>{w.tool}</p>
              <p style={{ margin: "0 0 2px", fontSize: 12, color: "#B45309", fontFamily: F }}>{w.warning}</p>
              {w.workaround && (
                <p style={{ margin: 0, fontSize: 12, color: theme.textMuted, fontFamily: F }}>
                  Workaround: {w.workaround}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recommendation sections */}
      {sections.map(({ label, value, mono }) => value ? (
        <div key={label} style={{ marginBottom: 16, background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
          {mono ? (
            <pre style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: "monospace", background: theme.codeBg, padding: "10px 12px", borderRadius: 8, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{value}</pre>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: theme.textSec, fontFamily: F, lineHeight: 1.6 }}>{value}</p>
          )}
        </div>
      ) : null)}

      {/* Reasoning */}
      {rec.reasoning && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#059669", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Why this structure</p>
          <p style={{ margin: 0, fontSize: 13, color: "#065F46", fontFamily: F, lineHeight: 1.7 }}>{rec.reasoning}</p>
        </div>
      )}

      {/* Integrations */}
      {rec.integrations?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Integrations to connect</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {rec.integrations.map(t => (
              <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, color: theme.blue, fontFamily: F, fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Complexity */}
      {rec.estimated_complexity && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F }}>COMPLEXITY</span>
          <div style={{ display: "flex", gap: 4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${rec.estimated_complexity >= n ? theme.blue : theme.borderInput}`, background: rec.estimated_complexity >= n ? theme.blueLight : theme.surface }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
            {["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"][rec.estimated_complexity]}
          </span>
        </div>
      )}

      {/* Rating */}
      {!feedbackSent ? (
        <div style={{ padding: "16px 18px", background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 10 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>
            Was this recommendation useful?
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => { setRating(n); setFeedbackSent(true); }}
                style={{ padding: "8px 14px", border: `1.5px solid ${rating === n ? theme.blue : theme.borderInput}`, borderRadius: 8, background: rating === n ? theme.blueLight : theme.surface, color: rating === n ? theme.blue : theme.textFaint, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: F }}>
                {"★".repeat(n)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, fontSize: 13, color: "#059669", fontFamily: F }}>
          Thanks for the feedback — it improves future recommendations.
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [currentBrief, setCurrentBrief] = useState(null);
  const [focused, setFocused] = useState(false);
  const { theme } = useTheme();

  const generateMutation = useGenerateBrief();
  const { data: pastBriefs } = useGeneratedBriefs();

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 20) return;
    setCurrentBrief(null);
    try {
      const brief = await generateMutation.mutateAsync(prompt);
      setCurrentBrief(brief);
    } catch (err) {
      // error handled via mutation state
    }
  };

  const handleExample = (example) => {
    setPrompt(example);
    setCurrentBrief(null);
  };

  return (
    <div style={{ padding: "32px 32px 80px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✨</div>
          <h1 style={{ margin: 0, fontSize: 24, fontFamily: "'Fraunces', serif" }}>Generate Workflow</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: theme.textMuted, fontFamily: F, maxWidth: 600 }}>
          Describe your team and what you're trying to solve. Flowpath will analyse past builds and recommend the optimal ClickUp setup.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: currentBrief ? "1fr 1fr" : "1fr", gap: 24 }}>

        {/* Left: Input */}
        <div>
          {/* Prompt input */}
          <div style={{ background: theme.surface, border: `1.5px solid ${focused ? theme.blue : theme.borderInput}`, borderRadius: 12, overflow: "hidden", boxShadow: focused ? `0 0 0 3px ${theme.blueLight}` : `0 1px 4px rgba(0,0,0,0.04)`, transition: "all 0.15s", marginBottom: 16 }}>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Describe your team and workflow challenge in plain English…

Example: We're a 9-person marketing agency managing 15 clients. We use Slack and HubSpot but nothing syncs. Project managers manually update a spreadsheet every Monday. We miss deadlines because nobody knows the real status of deliverables."
              rows={8}
              style={{ width: "100%", padding: "16px 18px", border: "none", outline: "none", fontFamily: F, fontSize: 14, color: theme.text, resize: "vertical", lineHeight: 1.7, boxSizing: "border-box", background: "transparent" }}
            />
            <div style={{ padding: "12px 18px", borderTop: `1px solid ${theme.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: prompt.length < 20 ? "#EF4444" : theme.textFaint, fontFamily: F }}>
                {prompt.length < 20 ? `${20 - prompt.length} more characters needed` : `${prompt.length} characters`}
              </span>
              <button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || prompt.trim().length < 20}
                style={{ padding: "9px 22px", background: generateMutation.isPending || prompt.trim().length < 20 ? theme.borderInput : theme.blue, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: generateMutation.isPending || prompt.trim().length < 20 ? "not-allowed" : "pointer", transition: "background 0.15s" }}
              >
                {generateMutation.isPending ? "Analysing…" : "Generate →"}
              </button>
            </div>
          </div>

          {/* Error */}
          {generateMutation.isError && (
            <div style={{ padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, marginBottom: 16, fontSize: 13, color: "#DC2626", fontFamily: F }}>
              {generateMutation.error?.response?.data?.error || "Generation failed. Check that ANTHROPIC_API_KEY is set."}
            </div>
          )}

          {/* Loading state */}
          {generateMutation.isPending && (
            <div style={{ padding: "24px 20px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                {["Parsing your scenario…", "Retrieving similar past builds…", "Generating recommendation…"].map((step, i) => (
                  <p key={i} style={{ margin: "4px 0", fontSize: 13, color: i === 0 ? theme.blue : theme.textFaint, fontFamily: F }}>
                    {i === 0 ? "⟳ " : "○ "}{step}
                  </p>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>This takes 5–15 seconds</p>
            </div>
          )}

          {/* Example prompts */}
          {!generateMutation.isPending && !currentBrief && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Try an example
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button key={i} onClick={() => handleExample(ex)}
                    style={{ padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.borderInput}`, borderRadius: 9, cursor: "pointer", textAlign: "left", fontSize: 12, color: theme.textMuted, fontFamily: F, lineHeight: 1.5, transition: "border-color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = theme.blue}
                    onMouseLeave={e => e.currentTarget.style.borderColor = theme.borderInput}
                  >
                    {ex.slice(0, 100)}…
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Past generated briefs */}
          {pastBriefs?.results?.length > 0 && !currentBrief && (
            <div style={{ marginTop: 28 }}>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Recent generations
              </p>
              {pastBriefs.results.slice(0, 5).map(b => (
                <button key={b.id} onClick={() => setCurrentBrief(b)}
                  style={{ width: "100%", padding: "10px 14px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 9, cursor: "pointer", textAlign: "left", marginBottom: 6, transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = theme.blue}
                  onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                >
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>
                    {b.parsed_scenario?.workflow_type || "Untitled scenario"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                    {b.parsed_scenario?.industry} · {formatDate(b.created_at)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recommendation */}
        {currentBrief && (
          <div style={{ background: theme.surfaceAlt, borderRadius: 12, padding: "20px", border: `1px solid ${theme.borderInput}` }}>
            <RecommendationPanel brief={currentBrief} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
