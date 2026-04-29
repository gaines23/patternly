import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { F } from "../constants";
import PromoteToLibraryButton from "../../../library/PromoteToLibraryButton";

function _triggerSummary(triggers) {
  if (!Array.isArray(triggers)) return "";
  return triggers.map(t => [t?.type, t?.detail].filter(Boolean).join(" — ")).filter(Boolean).join("; ");
}
function _actionSummary(actions) {
  if (!Array.isArray(actions)) return "";
  return actions.map(a => [a?.type, a?.detail].filter(Boolean).join(" — ")).filter(Boolean).join("; ");
}

/**
 * Collapsible automation viewer inside the Build section.
 *
 * Displays triggers, actions (ClickUp only), and instructions for one automation.
 *
 * Props:
 *   auto      — automation object
 *   autoIdx   — 0-based index (displayed as "Automation N")
 *   forceOpen — always show body (used during print)
 */
export default function ViewAutoCard({ auto, autoIdx, forceOpen = false, caseFileId, sourcePath, listName, workflowName, listTags = [] }) {
  const [collapsed, setCollapsed] = useState(true);
  const { theme } = useTheme();

  const isThirdParty = (auto.platform || "clickup") === "third_party";
  const platformLabel = isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp";
  const platformColor = isThirdParty ? "#7C3AED" : "#0284C7";
  const platformBg = isThirdParty ? "#F5F3FF" : "#EEEAF8";
  const platformBorder = isThirdParty ? "#DDD6FE" : "#BAE6FD";
  const isOpen = forceOpen || !collapsed;

  return (
    <div style={{ border: `1px solid ${theme.borderInput}`, borderLeft: "3px solid #0284C780", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => !forceOpen && setCollapsed(c => !c)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", background: theme.surfaceAlt, border: "none",
          cursor: forceOpen ? "default" : "pointer",
          borderBottom: isOpen ? `1px solid ${theme.borderInput}` : "none",
          minHeight: 44,
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Automation {autoIdx + 1}
        </p>
        <span style={{ fontSize: 11, fontWeight: 600, color: platformColor, background: platformBg, border: `1px solid ${platformBorder}`, borderRadius: 6, padding: "2px 8px", fontFamily: F }}>
          {platformLabel}
        </span>
        {auto.pipelinePhase && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", fontFamily: F }}>
            {auto.pipelinePhase}
          </span>
        )}
        {auto.automation_mode === "standalone" && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 6, padding: "2px 7px", fontFamily: F }}>
            STANDALONE
          </span>
        )}
        {auto.use_agent && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 6, padding: "2px 7px", fontFamily: F }}>
            AGENT ON
          </span>
        )}
        {caseFileId && auto.use_agent && (auto.instructions || "").trim() && (
          <span style={{ marginLeft: "auto", display: "inline-flex" }} onClick={e => e.stopPropagation()}>
            <PromoteToLibraryButton
              caseFileId={caseFileId}
              sourceLayer="build.automations"
              sourcePath={sourcePath}
              suggestedKind="automation"
              suggestedName={(auto.map_description || "").trim() || (listName ? `${listName} — Agent Automation ${autoIdx + 1}` : `Agent Automation ${autoIdx + 1}`)}
              suggestedBody={{
                instructions: auto.instructions || "",
                trigger: _triggerSummary(auto.triggers),
                actions: _actionSummary(auto.actions),
              }}
              suggestedTags={[workflowName, listName, ...listTags].filter(Boolean)}
            />
          </span>
        )}
        {!forceOpen && (
          <span style={{ color: theme.textFaint, fontSize: 11, marginLeft: caseFileId && auto.use_agent ? 8 : "auto" }}>
            {collapsed ? "▼" : "▲"}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ padding: "12px 14px", background: theme.surfaceAlt }}>
          {auto.triggers?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Triggers</span>
              {auto.triggers.map((t, ti) => t.type && (
                <div key={ti} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", fontFamily: F, background: "#EFF6FF", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.type}</span>
                  {t.detail && <span style={{ fontSize: 12, color: theme.textSec, fontFamily: F }}>{t.detail}</span>}
                </div>
              ))}
            </div>
          )}

          {!isThirdParty && auto.actions?.length > 0 && (
            <div style={{ marginBottom: auto.instructions ? 8 : 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</span>
              {auto.actions.map((a, ai2) => a.type && (
                <div key={ai2} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: F, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{a.type}</span>
                  {a.detail && <span style={{ fontSize: 12, color: theme.textSec, fontFamily: F }}>{a.detail}</span>}
                </div>
              ))}
            </div>
          )}

          {auto.instructions && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {!isThirdParty ? "Instructions" : "Actions / Instructions"}
                </span>
                {auto.use_agent && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 6, padding: "2px 7px", fontFamily: F, letterSpacing: "0.04em" }}>AGENT ON</span>
                )}
              </div>
              <pre style={{ margin: 0, fontSize: 12, fontFamily: "monospace", background: "#1E1E2E", color: "#E2E8F0", padding: "10px 12px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {auto.instructions}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
