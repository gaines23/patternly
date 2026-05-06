import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMatchTemplates } from "../../hooks/useWorkflows";
import { useTheme } from "../../hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

const LIBRARY_KIND_ACCENT = {
  formula:            { bg: "#EEF2FF", color: "#4F46E5", border: "#C7D2FE" },
  automation:         { bg: "#FFF7ED", color: "#C2410C", border: "#FED7AA" },
  custom_field_set:   { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" },
  template:           { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" },
  integration_recipe: { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
  snippet:            { bg: "#F1F5F9", color: "#334155", border: "#CBD5E1" },
};

function LibraryMatchesPanel({ matches, theme }) {
  if (!matches || matches.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#6D28D9", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          From your team's library · {matches.length}
        </p>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: theme.textMuted, fontFamily: F }}>
        Reusable formulas, automations, and templates your team has saved that match this scenario. The AI will draw on these when generating.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {matches.map(m => {
          const accent = LIBRARY_KIND_ACCENT[m.kind] || LIBRARY_KIND_ACCENT.snippet;
          return (
            <Link
              key={m.id}
              to={`/library/${m.id}`}
              style={{
                textDecoration: "none", color: "inherit", display: "block",
                padding: "10px 12px",
                background: theme.surface, border: `1px solid ${theme.border}`,
                borderRadius: 9,
                transition: "border-color 0.12s, background 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent.border; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                  background: accent.bg, color: accent.color, border: `1px solid ${accent.border}`,
                  fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}>{m.kind_label || m.kind}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F }}>
                  {m.score}/100
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, lineHeight: 1.4 }}>
                {m.name}
              </p>
              {m.body_preview && (
                <p style={{
                  margin: "3px 0 0", fontSize: 11.5, color: theme.textMuted, fontFamily: F, lineHeight: 1.5,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {m.body_preview}
                </p>
              )}
              {m.source_case_file_name && (
                <p style={{ margin: "4px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                  from {m.source_case_file_name}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const EXAMPLE_PROMPTS = [
  "We're a 9-person marketing agency managing 15 clients. We use Slack and HubSpot but nothing syncs. Deliverables fall through the cracks every week.",
  "12-person SaaS engineering team migrating from Linear to ClickUp. Need sprint tracking with GitHub PR integration and velocity reports.",
  "Boutique consulting firm, 6 consultants. New client onboarding takes 3 weeks and is tracked in email threads. Need a standardised process.",
  "DTC brand producing 40+ content pieces per month. Currently in Airtable but team finds it too database-y. Need a content calendar that shows what's in production.",
];

const COMPLEXITY_LABELS = ["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"];

function ScoreBadge({ score, theme }) {
  const colour =
    score >= 70 ? { bg: "#ECFDF5", border: "#6EE7B7", text: "#059669" }
    : score >= 40 ? { bg: "#EEEAF8", border: "#C8C2E8", text: "#7B72B8" }
    : { bg: theme.surfaceAlt, border: theme.border, text: theme.textFaint };

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px",
      background: colour.bg, border: `1px solid ${colour.border}`,
      borderRadius: 10, color: colour.text, fontFamily: F,
    }}>
      {score}% match
    </span>
  );
}

function TemplateCard({ result, isSelected, onSelect, theme }) {
  const { template, score, match_reasons } = result;
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        border: `1.5px solid ${isSelected ? theme.blue : theme.borderInput}`,
        borderRadius: 12,
        background: isSelected ? theme.blueLight : theme.surface,
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
        cursor: "pointer",
      }}
      onClick={() => onSelect(result)}
    >
      {/* Card header */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: F }}>
            {template.name}
          </p>
          <ScoreBadge score={score} theme={theme} />
        </div>

        <p style={{ margin: "0 0 10px", fontSize: 12, color: theme.textMuted, fontFamily: F, lineHeight: 1.5 }}>
          {template.description}
        </p>

        {/* Match reasons */}
        {match_reasons.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {match_reasons.map((r, i) => (
              <span key={i} style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 8,
                background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
                color: theme.textMuted, fontFamily: F,
              }}>
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Complexity + expand toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F }}>COMPLEXITY</span>
            <div style={{ display: "flex", gap: 3 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  width: 14, height: 14, borderRadius: 3,
                  border: `2px solid ${template.estimated_complexity >= n ? theme.blue : theme.borderInput}`,
                  background: template.estimated_complexity >= n ? theme.blueLight : theme.surface,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: F }}>
              {COMPLEXITY_LABELS[template.estimated_complexity]}
            </span>
          </div>
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
        </div>
      </div>

      {/* Expanded build details */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
          {[
            { label: "Spaces", value: template.spaces },
            { label: "Lists", value: template.lists },
            { label: "Status Flow", value: template.statuses },
            { label: "Custom Fields", value: template.custom_fields, mono: true },
            { label: "Automations", value: template.automations, mono: true },
            { label: "Build Notes", value: template.build_notes },
          ].map(({ label, value, mono }) => value ? (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ margin: "0 0 4px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
              {mono ? (
                <pre style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: "monospace", background: theme.codeBg, padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{value}</pre>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.5 }}>{value}</p>
              )}
            </div>
          ) : null)}

          {template.integrations?.length > 0 && (
            <div>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>Integrations</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {template.integrations.map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, color: theme.blue, fontFamily: F, fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchResultsPanel({ result, theme }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(result.matches[0]?.template?.id || null);

  const selectedMatch = result.matches.find(m => m.template.id === selectedId) || result.matches[0];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 700, color: theme.blue, fontFamily: F }}>
            {result.matches.length} template{result.matches.length !== 1 ? "s" : ""} matched
          </p>
          {result.parsed?.workflow_type && (
            <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>
              Detected: {result.parsed.workflow_type}
              {result.parsed.industries?.length > 0 && ` · ${result.parsed.industries.join(", ")}`}
            </p>
          )}
        </div>
        {selectedMatch && (
          <button
            onClick={() => navigate("/projects/new", { state: { templateData: selectedMatch.template } })}
            style={{ padding: "9px 18px", background: theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}
          >
            Use this template →
          </button>
        )}
      </div>

      {/* Template cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {result.matches.map(m => (
          <TemplateCard
            key={m.template.id}
            result={m}
            isSelected={m.template.id === selectedId}
            onSelect={m => setSelectedId(m.template.id)}
            theme={theme}
          />
        ))}
      </div>

      {result.matches.length === 0 && (
        <div style={{ padding: "24px 20px", textAlign: "center", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12 }}>
          <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600, color: theme.textSec, fontFamily: F }}>No templates matched</p>
          <p style={{ margin: 0, fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            Try describing your workflow type or industry more specifically.
          </p>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [focused, setFocused] = useState(false);
  const { theme } = useTheme();

  const matchMutation = useMatchTemplates();

  const handleMatch = async () => {
    if (!prompt.trim() || prompt.trim().length < 20) return;
    setMatchResult(null);
    try {
      const result = await matchMutation.mutateAsync(prompt);
      setMatchResult(result);
    } catch {
      // error handled via mutation state
    }
  };

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✨</div>
          <h1 style={{ margin: 0, fontSize: 24, fontFamily: "'Fraunces', serif" }}>Find a Workflow Template</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: theme.textMuted, fontFamily: F, maxWidth: 600 }}>
          Describe your team and what you're trying to solve. Patternly will match you to the best pre-built workflow template.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: matchResult ? "1fr 1fr" : "1fr", gap: 24 }}>

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
                onClick={handleMatch}
                disabled={matchMutation.isPending || prompt.trim().length < 20}
                style={{ padding: "9px 22px", background: matchMutation.isPending || prompt.trim().length < 20 ? theme.borderInput : theme.blue, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: matchMutation.isPending || prompt.trim().length < 20 ? "not-allowed" : "pointer", transition: "background 0.15s" }}
              >
                {matchMutation.isPending ? "Matching…" : "Find templates →"}
              </button>
            </div>
          </div>

          {/* Error */}
          {matchMutation.isError && (
            <div style={{ padding: "12px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, marginBottom: 16, fontSize: 13, color: "#DC2626", fontFamily: F }}>
              {matchMutation.error?.response?.data?.error || "Matching failed. Check that ANTHROPIC_API_KEY is set."}
            </div>
          )}

          {/* Loading state */}
          {matchMutation.isPending && (
            <div style={{ padding: "24px 20px", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                {["Parsing your scenario…", "Scoring templates…"].map((step, i) => (
                  <p key={i} style={{ margin: "4px 0", fontSize: 13, color: i === 0 ? theme.blue : theme.textFaint, fontFamily: F }}>
                    {i === 0 ? "⟳ " : "○ "}{step}
                  </p>
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>This takes a few seconds</p>
            </div>
          )}

          {/* Example prompts */}
          {!matchMutation.isPending && !matchResult && (
            <div>
              <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Try an example
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button key={i} onClick={() => { setPrompt(ex); setMatchResult(null); }}
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
        </div>

        {/* Right: Match results */}
        {matchResult && (
          <div style={{ background: theme.surfaceAlt, borderRadius: 12, padding: "20px", border: `1px solid ${theme.borderInput}` }}>
            <MatchResultsPanel result={matchResult} theme={theme} />
            <LibraryMatchesPanel matches={matchResult.library_matches} theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
