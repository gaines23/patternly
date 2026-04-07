import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useCaseFile, useDeleteCaseFile, useUpdateCaseFile, useShareCaseFile, useToggleCaseFileStatus } from "../../hooks/useCaseFiles";
import { formatDate, satisfactionLabel, formStateToCaseFilePayload, caseFileToFormState, briefToSuggestedAutomations } from "../../utils/transforms";
import CaseFileForm, { ChipGroup, IndustryPicker, FrameworkPicker, TOOLS, PAIN_POINTS, CLICKUP_TRIGGERS, CLICKUP_ACTIONS, THIRD_PARTY_PLATFORMS, CURRENT_TOOLS_USED, FAILURE_REASONS, WORKFLOW_TYPES } from "../../components/CaseFileForm";
import { useBriefByCaseFile } from "../../hooks/useWorkflows";
import { useTheme } from "../../hooks/useTheme";
import { WorkflowMapPanel } from "../../components/WorkflowMapPanel";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";


function Section({ title, subtitle, color, children, collapsible = false, forceOpen = false, filled = true }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isOpen = !collapsible || open || forceOpen;
  return (
    <div style={{ marginBottom: isOpen ? 28 : 4 }}>
      <div
        onClick={collapsible && !forceOpen ? () => setOpen(o => !o) : undefined}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 14px",
          background: isOpen ? `${color}12` : theme.surface,
          borderRadius: isOpen ? "10px 10px 0 0" : 10,
          border: `1px solid ${isOpen ? color + "40" : theme.border}`,
          borderBottom: isOpen ? `1.5px solid ${color}50` : `1px solid ${theme.border}`,
          cursor: collapsible && !forceOpen ? "pointer" : "default",
          userSelect: collapsible && !forceOpen ? "none" : undefined,
          transition: "background 0.15s, border-color 0.15s",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {filled
            ? <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>✓</span>
            : <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isOpen ? color : theme.borderInput}`, background: isOpen ? `${color}15` : "transparent", flexShrink: 0 }} />
          }
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isOpen ? color : theme.text, fontFamily: F }}>{title}</p>
            {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>{subtitle}</p>}
          </div>
        </div>
        {collapsible && !forceOpen && (
          <span style={{ fontSize: 16, color: isOpen ? color : theme.textMuted, display: "inline-block", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s, color 0.15s", flexShrink: 0 }}>▾</span>
        )}
      </div>
      <div className="fp-section-body" style={{
        display: isOpen ? undefined : "none",
        background: theme.surface,
        border: `1px solid ${color}40`,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        padding: "18px 14px",
      }}>
        {children}
      </div>
    </div>
  );
}

function CollapsibleCard({ title, color = "#0284C7", borderColor = "#BAE6FD", background = "#0284C710", badge, children, forceOpen = false, action }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const isOpen = open || forceOpen;
  return (
    <div className="fp-collapsible-card" style={{ border: `1px solid ${borderColor}`, borderRadius: 12, marginBottom: 14, background, overflow: "hidden" }}>
      <div
        onClick={forceOpen ? undefined : () => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 16px",
          cursor: forceOpen ? "default" : "pointer",
          userSelect: forceOpen ? "none" : "none",
        }}>
        {badge}
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: F }}>{title}</span>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        {!forceOpen && <span style={{ fontSize: 11, color, opacity: 0.6 }}>{isOpen ? "▲" : "▼"}</span>}
      </div>
      <div className="fp-collapsible-body" style={{ display: isOpen ? undefined : "none", padding: "0 16px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, fullWidth }) {
  const { theme } = useTheme();
  if (!value && value !== 0) return null;
  const displayValue = Array.isArray(value)
    ? value.length === 0 ? null : value.join(", ")
    : value;
  if (!displayValue) return null;
  return (
    <div style={{
      display: fullWidth ? "block" : "grid",
      gridTemplateColumns: "180px 1fr",
      gap: 12,
      padding: "10px 0",
      borderBottom: `1px solid ${theme.borderSubtle}`,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: fullWidth ? 0 : 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.6, marginTop: fullWidth ? 10 : 0, display: fullWidth ? "block" : "inline" }}>
        {typeof displayValue === "boolean"
          ? displayValue ? "Yes" : "No"
          : displayValue}
      </span>
    </div>
  );
}

function TagList({ items, color = BLUE }) {
  const { theme } = useTheme();
  if (!items?.length) return <span style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>None</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(item => (
        <span key={item} style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 12,
          background: color + "12", border: `1px solid ${color}30`,
          color, fontFamily: F, fontWeight: 500,
        }}>{item}</span>
      ))}
    </div>
  );
}

function SatisfactionStars({ score }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ fontSize: 20, color: score >= n ? "#F59E0B" : theme.border }}>
            {score >= n ? "★" : "☆"}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 13, color: theme.textMuted, fontFamily: F }}>
        {satisfactionLabel(score)}
      </span>
    </div>
  );
}

function RoadblockCard({ rb, index }) {
  const { theme } = useTheme();
  const sevColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" };
  const sc = sevColors[rb.severity] || "#9CA3AF";
  return (
    <div style={{
      border: `1px solid ${sc}30`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 10,
      background: sc + "08",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textSec, fontFamily: F }}>
          Roadblock {index + 1}
        </span>
        {rb.severity && (
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {rb.severity.toUpperCase()}
          </span>
        )}
        {rb.type && (
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
            {rb.type.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <Row label="Description " value={rb.description} fullWidth />
      <Row label="Tools affected" value={rb.tools_affected} />
      <Row label="Workaround found" value={rb.workaround_found === true ? "Yes" : rb.workaround_found === false ? "No" : null} />
      <Row label="Workaround " value={rb.workaround_description} fullWidth />
      <Row label="Time cost" value={rb.time_cost_hours ? `${rb.time_cost_hours}h` : null} />
      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#EA580C12", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Future warning: </span>
          <span style={{ fontSize: 13, color: theme.textSec, fontFamily: F }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}

function CurrentBuildCard({ build, index }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const urgColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" };
  const uc = urgColors[build.urgency?.toLowerCase()] || "#9CA3AF";
  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: open ? "#E0F2FE" : theme.surface, cursor: "pointer", userSelect: "none", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>{build.tool}</span>}
        {build.urgency && (
          <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {build.urgency.toUpperCase()}
          </span>
        )}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#0284C7", opacity: 0.6 }}>{open ? "▲" : "▼"}</span>
      </div>
      <div className="fp-collapsible-body" style={{ display: open ? undefined : "none", padding: "14px 16px", background: theme.surface, borderTop: "1px solid #BAE6FD" }}>
        <Row label="Structure" value={build.structure} fullWidth />
        {build.failure_reasons?.length > 0 && (
          <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Why it's failing</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {build.failure_reasons.map(r => (
                <span key={r} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontFamily: F }}>{r}</span>
              ))}
            </div>
          </div>
        )}
        <Row label="What breaks" value={build.what_breaks} fullWidth />
        <Row label="Workarounds" value={build.workarounds_they_use} fullWidth />
        <Row label="How long broken" value={build.how_long_broken} />
        <Row label="Reported by" value={build.who_reported} />
        <Row label="Business impact" value={build.impact_on_team} fullWidth />
      </div>
    </div>
  );
}

function ViewAutoCard({ auto, autoIdx, forceOpen = false }) {
  const [collapsed, setCollapsed] = useState(true);
  const { theme } = useTheme();
  const isThirdParty = (auto.platform||"clickup") === "third_party";
  const platformLabel = isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp";
  const platformColor = isThirdParty ? "#7C3AED" : "#0284C7";
  const platformBg = isThirdParty ? "#F5F3FF" : "#EFF6FF";
  const platformBorder = isThirdParty ? "#DDD6FE" : "#BAE6FD";
  const isOpen = forceOpen || !collapsed;
  return (
    <div style={{ border:`1px solid ${theme.borderInput}`, borderLeft:"3px solid #0284C780", borderRadius:8, marginBottom:8, overflow:"hidden" }}>
      <button type="button" onClick={()=>!forceOpen && setCollapsed(c=>!c)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:theme.surfaceAlt, border:"none", cursor:forceOpen?"default":"pointer", borderBottom:isOpen?`1px solid ${theme.borderInput}`:"none", minHeight:44 }}>
        <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#0284C7", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Automation {autoIdx+1}</p>
        <span style={{ fontSize:11, fontWeight:600, color:platformColor, background:platformBg, border:`1px solid ${platformBorder}`, borderRadius:6, padding:"2px 8px", fontFamily:F }}>{platformLabel}</span>
        {auto.pipelinePhase && <span style={{ fontSize:10, fontWeight:700, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:6, padding:"2px 8px", fontFamily:F }}>{auto.pipelinePhase}</span>}
        {auto.use_agent && <span style={{ fontSize:10, fontWeight:700, color:"#7C3AED", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:6, padding:"2px 7px", fontFamily:F }}>AGENT ON</span>}
        {!forceOpen && <span style={{ color:theme.textFaint, fontSize:11, marginLeft:"auto" }}>{collapsed?"▼":"▲"}</span>}
      </button>
      {isOpen && (
        <div style={{ padding:"12px 14px", background:theme.surfaceAlt }}>
          {auto.triggers?.length > 0 && (
            <div style={{ marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:600, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Triggers</span>
              {auto.triggers.map((t,ti) => t.type && (
                <div key={ti} style={{ display:"flex", gap:8, alignItems:"baseline", marginTop:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#0284C7", fontFamily:F, background:"#EFF6FF", border:"1px solid #BAE6FD", borderRadius:6, padding:"2px 8px", whiteSpace:"nowrap" }}>{t.type}</span>
                  {t.detail && <span style={{ fontSize:12, color:theme.textSec, fontFamily:F }}>{t.detail}</span>}
                </div>
              ))}
            </div>
          )}
          {!isThirdParty && auto.actions?.length > 0 && (
            <div style={{ marginBottom: auto.instructions ? 8 : 0 }}>
              <span style={{ fontSize:11, fontWeight:600, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Actions</span>
              {auto.actions.map((a,ai2) => a.type && (
                <div key={ai2} style={{ display:"flex", gap:8, alignItems:"baseline", marginTop:4 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:"#059669", fontFamily:F, background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:6, padding:"2px 8px", whiteSpace:"nowrap" }}>{a.type}</span>
                  {a.detail && <span style={{ fontSize:12, color:theme.textSec, fontFamily:F }}>{a.detail}</span>}
                </div>
              ))}
            </div>
          )}
          {auto.instructions && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:600, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {!isThirdParty ? "Instructions" : "Actions / Instructions"}
                </span>
                {auto.use_agent && <span style={{ fontSize:10, fontWeight:700, color:"#7C3AED", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:6, padding:"2px 7px", fontFamily:F, letterSpacing:"0.04em" }}>AGENT ON</span>}
              </div>
              <pre style={{ margin:0, fontSize:12, fontFamily:"monospace", background:"#1E1E2E", color:"#E2E8F0", padding:"10px 12px", borderRadius:7, whiteSpace:"pre-wrap", lineHeight:1.6 }}>{auto.instructions}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShareModal({ cf, onClose }) {
  const { theme } = useTheme();
  const shareMutation = useShareCaseFile(cf.id);
  const [copied, setCopied] = useState(false);

  const shareUrl = cf.share_token
    ? `${window.location.origin}/brief/${cf.share_token}`
    : null;

  const handleToggle = () => {
    shareMutation.mutate();
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: theme.surface, borderRadius: 16, padding: "28px 32px",
        maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Fraunces', serif" }}>Share client brief</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textFaint, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: theme.textMuted, fontFamily: F, lineHeight: 1.6 }}>
          Generate a read-only link you can send to your client for sign-off. The link shows the workspace blueprint without any internal notes or account details.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontFamily: F, color: theme.textSec, fontWeight: 600 }}>Sharing</span>
          <button
            onClick={handleToggle}
            disabled={shareMutation.isPending}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: cf.share_enabled ? BLUE : "#D1D5DB",
              position: "relative", transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: cf.share_enabled ? 22 : 3,
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", display: "block",
            }} />
          </button>
          <span style={{ fontSize: 13, fontFamily: F, color: cf.share_enabled ? "#059669" : "#9CA3AF" }}>
            {cf.share_enabled ? "Active" : "Off"}
          </span>
        </div>
        {cf.share_enabled && shareUrl && (
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <input
              readOnly
              value={shareUrl}
              style={{
                flex: 1, fontFamily: F, fontSize: 12, color: theme.textSec,
                border: `1.5px solid ${theme.borderInput}`, borderRadius: 8, padding: "9px 12px",
                background: theme.inputBgDisabled, outline: "none",
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: "9px 16px", borderRadius: 8, border: "none",
                background: copied ? "#059669" : BLUE,
                color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        )}
        {!cf.share_enabled && (
          <div style={{ padding: "12px 14px", background: theme.surfaceAlt, borderRadius: 8, border: `1px solid ${theme.borderInput}` }}>
            <p style={{ margin: 0, fontSize: 13, color: theme.textFaint, fontFamily: F }}>
              Enable sharing above to generate a link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Self-contained print layout — matches SharedBriefPage exactly ────────────
const PF = "'Plus Jakarta Sans', sans-serif";

function PSection({ title, subtitle, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: `${color}12`, borderRadius: "10px 10px 0 0", border: `1px solid ${color}40`, borderBottom: `1.5px solid ${color}50` }}>
        <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>✓</span>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color, fontFamily: PF }}>{title}</p>
          {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: PF }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${color}40`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "18px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function PRow({ label, value, fullWidth }) {
  if (!value && value !== 0) return null;
  const display = Array.isArray(value) ? (value.length === 0 ? null : value.join(", ")) : value;
  if (!display) return null;
  return (
    <div style={{ display: fullWidth ? "block" : "grid", gridTemplateColumns: "180px 1fr", gap: 12, padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: fullWidth ? 0 : 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#374151", fontFamily: PF, lineHeight: 1.6, marginTop: fullWidth ? 10 : 0, display: fullWidth ? "block" : "inline" }}>
        {typeof display === "boolean" ? (display ? "Yes" : "No") : display}
      </span>
    </div>
  );
}

function PTagList({ items, color = "#2563EB" }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(item => (
        <span key={item} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: color + "12", border: `1px solid ${color}30`, color, fontFamily: PF, fontWeight: 500 }}>{item}</span>
      ))}
    </div>
  );
}

function PBuildCard({ build, index }) {
  return (
    <div style={{ border: "1px solid #BAE6FD", borderLeft: "3px solid #0284C7", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#E0F2FE", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: PF }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: PF }}>{build.tool}</span>}
        {build.urgency && (() => {
          const uc = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" }[build.urgency?.toLowerCase()] || "#9CA3AF";
          return <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: PF }}>{build.urgency.toUpperCase()}</span>;
        })()}
      </div>
      <div style={{ padding: "14px 16px", background: "#fff", borderTop: "1px solid #BAE6FD" }}>
        <PRow label="Structure" value={build.structure} fullWidth />
        {build.failure_reasons?.length > 0 && (
          <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Why it's failing</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {build.failure_reasons.map(r => <span key={r} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontFamily: PF }}>{r}</span>)}
            </div>
          </div>
        )}
        <PRow label="What breaks" value={build.what_breaks} fullWidth />
        <PRow label="Workarounds" value={build.workarounds_they_use} fullWidth />
        <PRow label="How long broken" value={build.how_long_broken} />
        <PRow label="Reported by" value={build.who_reported} />
        <PRow label="Business impact" value={build.impact_on_team} fullWidth />
      </div>
    </div>
  );
}

function PRoadblockCard({ rb, index }) {
  const sc = ({ low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" })[rb.severity] || "#9CA3AF";
  return (
    <div style={{ border: `1px solid ${sc}30`, borderLeft: `3px solid ${sc}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: sc + "05" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: PF }}>Roadblock {index + 1}</span>
        {rb.severity && <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: PF }}>{rb.severity.toUpperCase()}</span>}
        {rb.type && <span style={{ fontSize: 12, color: "#6B7280", fontFamily: PF }}>{rb.type.replace(/_/g, " ")}</span>}
      </div>
      <PRow label="Description" value={rb.description} fullWidth />
      <PRow label="Tools affected" value={rb.tools_affected} />
      <PRow label="Workaround" value={rb.workaround_description} fullWidth />
      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Note: </span>
          <span style={{ fontSize: 13, color: "#92400E", fontFamily: PF }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}

function PrintView({ cf }) {
  const { audit, intake, build, delta, reasoning, outcome, project_updates } = cf;
  return (
    <div style={{ fontFamily: PF, background: "#fff" }}>
      {/* Branded top bar — matches SharedBriefPage exactly */}
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
          {cf.logged_by_name && <span>Prepared by <strong style={{ color: "#374151" }}>{cf.logged_by_name}</strong></span>}
          {cf.team_size && <><span>·</span><span>{cf.team_size} team</span></>}
        </div>
      </div>

      {/* Meta chips */}
      {(cf.industries?.length > 0 || cf.tools?.length > 0 || cf.process_frameworks?.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {cf.industries?.map(i => <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#2563EB", fontFamily: PF, fontWeight: 500 }}>{i}</span>)}
          {cf.tools?.slice(0, 6).map(t => <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#6B7280", fontFamily: PF }}>{t}</span>)}
          {cf.process_frameworks?.slice(0, 4).map(f => <span key={f} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontFamily: PF }}>{f}</span>)}
        </div>
      )}

      {/* Project Updates */}
      {project_updates?.length > 0 && (
        <PSection title="Project Updates" color="#0284C7">
          {project_updates.map((pu, i) => {
            const dateLabel = pu.created_at
              ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
              : "—";
            return (
              <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: PF }}>{dateLabel}</span>
                  {pu.attachments?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: PF }}>📎 {pu.attachments.length}</span>}
                </div>
                <div style={{ padding: "12px 14px", background: "#fff" }}>
                  {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: PF, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                  {pu.attachments?.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {pu.attachments.map((att, ai) => att.url && (
                        <span key={ai} style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: PF, fontWeight: 500 }}>{att.name || att.url}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </PSection>
      )}

      {/* Scope Creep */}
      {delta?.scope_creep?.length > 0 && (
        <PSection title="Scope Creep" color="#D97706">
          {delta.scope_creep.map((sc, i) => (
            <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: PF }}>{sc.area || `Item ${i + 1}`}</p>
              {sc.reason && <PRow label="Why added" value={sc.reason} fullWidth />}
              {sc.impact && <PRow label="Impact" value={sc.impact} fullWidth />}
              {sc.communicated != null && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: PF,
                    color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                    background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                    border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                    borderRadius: 8, padding: "2px 10px" }}>
                    {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </PSection>
      )}

      {/* What's in place now — Audit */}
      {audit && (audit.overall_assessment || audit.pattern_summary) && (
        <PSection title="What's in place now?" subtitle="Document the client's current setup and what's breaking" color="#7C3AED">
          <PRow label="Overall assessment" value={audit.overall_assessment} fullWidth />
          <PRow label="Pattern summary" value={audit.pattern_summary} fullWidth />
        </PSection>
      )}

      {/* Who's the client — Intake */}
      {intake && (intake.workflow_type || intake.team_size || intake.industries?.length > 0 || intake.tools?.length > 0 || intake.pain_points?.length > 0 || intake.process_frameworks?.length > 0 || intake.prior_attempts) && (
        <PSection title="Who's the client?" subtitle="Capture the scenario, industry, team, and tools" color="#7C3AED">
          <PRow label="Team size" value={intake.team_size} />
          <PRow label="Workflow type" value={intake.workflow_type} />
          {intake.industries?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
              <PTagList items={intake.industries} color="#2563EB" />
            </div>
          )}
          {intake.process_frameworks?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Frameworks</span>
              <PTagList items={intake.process_frameworks} color="#7C3AED" />
            </div>
          )}
          {intake.tools?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Tools in use</span>
              <PTagList items={intake.tools} color="#6B7280" />
            </div>
          )}
          {intake.pain_points?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
              <PTagList items={intake.pain_points} color="#7C3AED" />
            </div>
          )}
          <PRow label="Prior attempts" value={intake.prior_attempts} fullWidth />
        </PSection>
      )}

      {/* Build Documentation */}
      {(build || audit?.builds?.length > 0) && (
        <PSection title="Build Documentation" subtitle="Document everything that was built" color="#0284C7">
          {audit?.builds?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Builds audited ({audit.builds.length})
              </p>
              {audit.builds.map((b, i) => <PBuildCard key={b.id || i} build={b} index={i} />)}
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
                      {l.space && <span style={{ fontSize: 11, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", fontFamily: PF, marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>{l.space}</span>}
                    </p>
                    <PRow label="Status flow" value={l.statuses} />
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
          {build?.build_notes && <PRow label="Build notes" value={build.build_notes} fullWidth />}
        </PSection>
      )}

      {/* Intent vs Reality — Delta */}
      {delta && (delta.user_intent || delta.success_criteria || delta.actual_build || delta.roadblocks?.length > 0) && (
        <PSection title="Intent vs Reality" subtitle="Log the gap between what was wanted and what was delivered" color="#059669">
          <PRow label="User intent" value={delta.user_intent} fullWidth />
          <PRow label="Success criteria" value={delta.success_criteria} fullWidth />
          <PRow label="What was built" value={delta.actual_build} fullWidth />
          <PRow label="Diverged" value={delta.diverged === true ? "Yes" : delta.diverged === false ? "No" : null} />
          <PRow label="Divergence reason" value={delta.divergence_reason} fullWidth />
          <PRow label="Compromises" value={delta.compromises} fullWidth />
          {delta.roadblocks?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>
                Roadblocks ({delta.roadblocks.length})
              </span>
              {delta.roadblocks.map((rb, i) => <PRoadblockCard key={rb.id || i} rb={rb} index={i} />)}
            </div>
          )}
        </PSection>
      )}

      {/* Decision Reasoning */}
      {reasoning && (reasoning.why_structure || reasoning.alternatives || reasoning.lessons) && (
        <PSection title="Decision Reasoning" subtitle="Record the reasoning behind every major decision" color="#059669">
          <PRow label="Why this structure" value={reasoning.why_structure} fullWidth />
          <PRow label="Alternatives considered" value={reasoning.alternatives} fullWidth />
          <PRow label="Why rejected" value={reasoning.why_rejected} fullWidth />
          <PRow label="Assumptions made" value={reasoning.assumptions} fullWidth />
          <PRow label="When NOT to use" value={reasoning.when_opposite} fullWidth />
          <PRow label="Lessons learned" value={reasoning.lessons} fullWidth />
          {reasoning.complexity && (
            <div style={{ padding: "10px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Complexity</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[1,2,3,4,5].map(n => (
                  <div key={n} style={{ width: 22, height: 22, borderRadius: 5, border: `2px solid ${reasoning.complexity >= n ? "#059669" : "#E5E7EB"}`, background: reasoning.complexity >= n ? "#ECFDF5" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: reasoning.complexity >= n ? "#059669" : "#E5E7EB", fontSize: 11 }}>◆</span>
                  </div>
                ))}
                <span style={{ fontSize: 13, color: "#6B7280", fontFamily: PF }}>
                  {["","Very simple","Simple","Moderate","Complex","Very complex"][reasoning.complexity]}
                </span>
              </div>
            </div>
          )}
        </PSection>
      )}

      {/* Outcome */}
      {outcome && (outcome.built || outcome.what_worked || outcome.what_failed) && (
        <PSection title="Outcome" subtitle="Capture the post-build result and long-term usage signal" color="#059669">
          <PRow label="Did they build it" value={outcome.built ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1) : null} />
          <PRow label="Block reason" value={outcome.block_reason} fullWidth />
          <PRow label="What changed" value={outcome.changes} fullWidth />
          <PRow label="What worked" value={outcome.what_worked} fullWidth />
          <PRow label="What failed" value={outcome.what_failed} fullWidth />
          <PRow label="Revisit when" value={outcome.revisit_when} fullWidth />
          {outcome.satisfaction > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: PF, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{ fontSize: 20, color: outcome.satisfaction >= n ? "#F59E0B" : "#E5E7EB" }}>
                    {outcome.satisfaction >= n ? "★" : "☆"}
                  </span>
                ))}
              </div>
            </div>
          )}
          <PRow label="Would recommend" value={outcome.recommend ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1) : null} />
        </PSection>
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

export default function CaseFileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const justCreated = location.state?.justCreated;
  const [showBanner, setShowBanner] = useState(!!justCreated);

  useEffect(() => {
    if (!justCreated) return;
    const t = setTimeout(() => setShowBanner(false), 3000);
    return () => clearTimeout(t);
  }, [justCreated]);

  const [isEditing, setIsEditing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [mapWfIndex, setMapWfIndex] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 900);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  useEffect(() => {
    const onBefore = () => setIsPrinting(true);
    const onAfter = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  const { data: cf, isLoading, isError } = useCaseFile(id);
  const deleteMutation = useDeleteCaseFile();
  const updateMutation = useUpdateCaseFile(id);
  const statusMutation = useToggleCaseFileStatus(id);
  const { data: linkedBrief } = useBriefByCaseFile(id);

  const handleDelete = async () => {
    if (!window.confirm("Delete this case file? This cannot be undone.")) return;
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

  if (isEditing) {
    const initialData = caseFileToFormState(cf);
    const suggestedAutomations = linkedBrief ? briefToSuggestedAutomations(linkedBrief) : [];
    return (
      <div>
        {apiError && (
          <div style={{ margin:"16px 32px 0", padding:"14px 18px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, fontSize:13, color:"#DC2626", fontFamily:F, whiteSpace:"pre-wrap" }}>
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

  const { audit, intake, build, delta, reasoning, outcome, project_updates, } = cf;

  return (
    <>
    <style>{`
      .fp-print-only { display: none; }
      @media print {
        /* Hide app shell chrome — keep sidebar logo, hide nav + footer */
        .fp-sidebar-nav { display: none !important; }
        .fp-sidebar-footer { display: none !important; }
        .fp-sidebar {
          position: static !important;
          width: auto !important;
          border: none !important;
          border-right: none !important;
          background: transparent !important;
        }
        .fp-mobile-header { display: none !important; }

        /* Remove forced heights so no blank pages */
        .fp-app-root { min-height: 0 !important; background: #fff !important; }
        .fp-main { margin-left: 0 !important; min-height: 0 !important; padding: 0 !important; }
        .fp-page-enter { min-height: 0 !important; }

        /* Hide all screen-only content */
        .fp-no-print { display: none !important; }

        /* Show print-only content, let fp-print-root flow normally */
        .fp-print-only { display: block !important; }
        #fp-print-root {
          max-width: none !important;
          width: 100% !important;
          padding: 0 !important;
          flex: none !important;
          background: #fff !important;
        }

        /* Force collapsed sections open */
        .fp-section-body { display: block !important; }
        .fp-collapsible-body { display: block !important; }
        .fp-collapsible-card { overflow: visible !important; }

        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 14mm 16mm; size: A4; }
      }
    `}</style>
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <div id="fp-print-root" style={{ flex: 1, minWidth: 0, maxWidth: 780, padding: "28px 32px 80px" }}>

      {/* ── PDF Print View ───────────────────────────────────────────────── */}
      <div className="fp-print-only">
        <PrintView cf={cf} />
      </div>

      {/* ── Screen View ──────────────────────────────────────────────────── */}
      <div className="fp-no-print">

      {/* Success banner */}
      {showBanner && (
        <div className="fp-no-print" style={{ padding: "12px 16px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 14, color: "#065F46", fontFamily: F, fontWeight: 600, flex: 1 }}>
            Case file saved successfully. It's now part of the knowledge base.
          </span>
          <button onClick={() => setShowBanner(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6EE7B7", lineHeight: 1, padding: 0 }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <Link to="/case-files" className="fp-no-print" style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
              ← Case files
            </Link>
            <h1 style={{ margin: "0 0 6px", fontSize: 24, fontFamily: "'Fraunces', serif", wordBreak: "break-word" }}>
              {cf.name || cf.workflow_type || "Untitled workflow"}
            </h1>
            {cf.name && cf.workflow_type && (
              <p style={{ margin: "0 0 6px", fontSize: 14, color: theme.textMuted, fontFamily: F }}>{cf.workflow_type}</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: theme.textMuted, fontFamily: F, alignItems: "center" }}>
              <span>Logged by <strong style={{ color: theme.textSec }}>{cf.logged_by_name || "—"}</strong></span>
              <span>·</span>
              <span>{formatDate(cf.created_at)}</span>
              {cf.satisfaction_score && (
                <>
                  <span>·</span>
                  <span>{cf.satisfaction_score}/5 satisfaction</span>
                </>
              )}
              {cf.roadblock_count > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: "#EA580C" }}>{cf.roadblock_count} roadblock{cf.roadblock_count !== 1 ? "s" : ""}</span>
                </>
              )}
              <span
                style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                  background: cf.status === "closed" ? "#ECFDF5" : "#EFF6FF",
                  border: `1px solid ${cf.status === "closed" ? "#6EE7B7" : "#BFDBFE"}`,
                  color: cf.status === "closed" ? "#065F46" : "#1D4ED8",
                  fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em",
                }}
              >
                {cf.status === "closed" ? "Closed" : "Open"}
              </span>
              {cf.status === "closed" && cf.closed_at && (
                <span style={{ fontSize: 12, color: theme.textFaint, fontFamily: F }}>
                  closed {formatDate(cf.closed_at)}
                </span>
              )}
            </div>
          </div>
          <div className="fp-no-print" style={{ display: "flex", gap: 8, flexShrink: 0, paddingTop: 28 }}>
            <button
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
              style={{
                padding: "9px 16px",
                background: cf.status === "closed" ? "#ECFDF5" : theme.surface,
                border: `1.5px solid ${cf.status === "closed" ? "#6EE7B7" : theme.borderInput}`,
                borderRadius: 9,
                color: cf.status === "closed" ? "#065F46" : theme.textSec,
                fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
                opacity: statusMutation.isPending ? 0.6 : 1,
              }}
            >
              {cf.status === "closed" ? "Reopen" : "Mark closed"}
            </button>
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowOptions(o => !o)}
                style={{ padding: "9px 16px", background: theme.surface, border: `1.5px solid ${theme.borderInput}`, borderRadius: 9, color: theme.textSec, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
              >
                Options <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
              </button>
              {showOptions && (
                <>
                  <div onClick={() => setShowOptions(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100, background: theme.surface, border: `1px solid ${theme.borderInput}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", minWidth: 170, overflow: "hidden" }}>
                    <button onClick={() => { setShowOptions(false); setIsEditing(true); }} style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${theme.borderSubtle}`, color: theme.text, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}>
                      Edit
                    </button>
                    <button onClick={() => { setShowOptions(false); setShowShare(true); }} style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${theme.borderSubtle}`, color: cf.share_enabled ? theme.blue : theme.text, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}>
                      {cf.share_enabled ? "🔗 Share link" : "Share link"}
                    </button>
                    <button onClick={() => {
                      setShowOptions(false);
                      const name = (cf.name || cf.workflow_type || "Case_File").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                      const date = new Date().toISOString().slice(0, 10);
                      const prev = document.title;
                      document.title = `${name}_${date}_Flowpath`;
                      flushSync(() => setIsPrinting(true));
                      window.onafterprint = () => { document.title = prev; window.onafterprint = null; setIsPrinting(false); };
                      window.print();
                    }} style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", borderBottom: `1px solid ${theme.borderSubtle}`, color: theme.text, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}>
                      Export PDF
                    </button>
                    <button
                      onClick={() => { setShowOptions(false); handleDelete(); }}
                      disabled={deleteMutation.isPending}
                      style={{ width: "100%", padding: "11px 16px", background: "none", border: "none", color: "#EF4444", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", textAlign: "left" }}
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* ── Print-only: Project Updates + Scope Creep (top of PDF) ──────── */}
      <div className="fp-print-only">
        {project_updates?.length > 0 && (
          <Section title="Project Updates" color="#0284C7">
            {project_updates.map((pu, i) => {
              const dateLabel = pu.created_at
                ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
                : "—";
              return (
                <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                    {pu.attachments?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                    {pu.attachments?.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pu.attachments.map((att, ai) => att.url && (
                          <span key={ai} style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F, fontWeight: 500 }}>
                            {att.name || att.url}
                          </span>
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
                {sc.reason && <Row label="Why added" value={sc.reason} fullWidth />}
                {sc.impact && <Row label="Impact" value={sc.impact} fullWidth />}
                {sc.communicated != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F,
                      color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                      background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                      border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                      borderRadius: 8, padding: "2px 10px" }}>
                      {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}
      </div>

      {/* ── Layer 1: Audit ──────────────────────────────────────────────── */}
      {audit && (
        <Section title="What's in place now?" subtitle="Document the client's current setup and what's breaking" color="#7C3AED" collapsible forceOpen={isPrinting}>
          <Row label="Has existing setup" value={audit.has_existing === true ? "Yes" : audit.has_existing === false ? "No — greenfield" : "—"} />
          <Row label="Overall assessment " value={audit.overall_assessment} fullWidth />
          <Row label="Tried to fix before" value={audit.tried_to_fix === true ? "Yes" : audit.tried_to_fix === false ? "No" : null} />
          <Row label="Previous fixes" value={audit.previous_fixes} fullWidth />
          {audit.pattern_summary && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#EA580C12", border: "1px solid #FED7AA", borderRadius: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pattern summary</p>
              <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.6 }}>{audit.pattern_summary}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 2: Intake ─────────────────────────────────────────────── */}
      {intake && (
        <Section title="Who's the client?" subtitle="Capture the scenario, industry, team, and tools" color="#7C3AED" collapsible forceOpen={isPrinting}>
          {/* {intake.raw_prompt && (
            <div style={{ padding: "12px 14px", background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw prompt</p>
              <p style={{ margin: 0, fontSize: 14, color: theme.textSec, fontFamily: F, lineHeight: 1.7, fontStyle: "italic" }}>"{intake.raw_prompt}"</p>
            </div>
          )} */}
          <Row label="Team size" value={intake.team_size} />
          <Row label="Workflow type" value={intake.workflow_type} />
          {intake.industries?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
              <TagList items={intake.industries} color={BLUE} />
            </div>
          )}
          {intake.process_frameworks?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Frameworks</span>
              <TagList items={intake.process_frameworks} color="#7C3AED" />
            </div>
          )}
          {intake.tools?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Tools in use</span>
              <TagList items={intake.tools} color={theme.textMuted} />
            </div>
          )}
          {intake.pain_points?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
              <TagList items={intake.pain_points} color="#DC2626" />
            </div>
          )}
          <Row label="Prior attempts" value={intake.prior_attempts} fullWidth />
        </Section>
      )}

      {/* ── Layer 3: Build ──────────────────────────────────────────────── */}
      {build && (
        <Section title="Build Documentation" subtitle="Document everything that was built" color="#0284C7" collapsible forceOpen={isPrinting}>
          {audit?.builds?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Builds audited ({audit.builds.length})
              </p>
              {audit.builds.map((b, i) => <CurrentBuildCard key={b.id} build={b} index={i} />)}
            </div>
          )}
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
          {build.workflows?.length > 0 ? build.workflows.map((wf, wi) => (
            <CollapsibleCard
              key={wi}
              title={wf.name || `Workflow ${wi + 1}`}
              badge={<span style={{ width: 24, height: 24, borderRadius: 6, background: "#0284C7", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: F, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{wi + 1}</span>}
              forceOpen={isPrinting}
              action={
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
              }
            >
              {wf.notes && <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.6, fontStyle: "italic" }}>{wf.notes}</p>}
              {wf.lists?.length > 0 && wf.lists.map((l, li) => (
                <div key={li} style={{ border: `1px solid ${theme.borderInput}`, borderLeft: "3px solid #0284C7", borderRadius: 9, padding: "12px 14px", marginBottom: 8, background: theme.surface }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>List {li + 1}{l.name ? ` — ${l.name}` : ""}</p>
                    {l.space && <span style={{ fontSize: 11, fontWeight: 600, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", fontFamily: F }}>{l.space}</span>}
                  </div>
                  <Row label="Status flow" value={l.statuses} />
                  {l.custom_fields && (
                    <div style={{ padding: "8px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Custom fields</span>
                      <pre style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: "monospace", background: theme.surfaceAlt, padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{l.custom_fields}</pre>
                    </div>
                  )}
                  {Array.isArray(l.automations) && l.automations.length > 0 && (
                    <div style={{ padding: "8px 0" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Automations</span>
                      {l.automations.map((auto, ai) => (
                        <ViewAutoCard key={ai} auto={auto} autoIdx={ai} forceOpen={isPrinting}/>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleCard>
          )) : (
            <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, fontStyle: "italic" }}>No workflows documented.</p>
          )}
          <Row label="Build notes" value={build.build_notes} fullWidth />
        </Section>
      )}

      {/* ── Layer 4: Delta ──────────────────────────────────────────────── */}
      {delta && (
        <Section title="Intent vs Reality" subtitle="Log the gap between what was wanted and what was delivered" color="#059669" collapsible forceOpen={isPrinting}>
          <Row label="User intent " value={delta.user_intent} fullWidth />
          <Row label="Success criteria " value={delta.success_criteria} fullWidth />
          <Row label="What was built " value={delta.actual_build} fullWidth />
          <Row label="Diverged" value={delta.diverged === true ? "Yes" : delta.diverged === false ? "No" : null} />
          <Row label="Divergence reason " value={delta.divergence_reason} fullWidth />
          <Row label="Compromises " value={delta.compromises} fullWidth />
          {delta.roadblocks?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Roadblocks ({delta.roadblocks.length})
              </p>
              {delta.roadblocks.map((r, i) => <RoadblockCard key={r.id} rb={r} index={i} />)}
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 5: Reasoning ─────────────────────────────────────────── */}
      {reasoning && (
        <Section title="Decision Reasoning" subtitle="Record the reasoning behind every major decision" color="#059669" collapsible forceOpen={isPrinting}>
          <Row label="Why this structure" value={reasoning.why_structure} fullWidth />
          <Row label="Alternatives considered" value={reasoning.alternatives} fullWidth />
          <Row label="Why rejected" value={reasoning.why_rejected} fullWidth />
          <Row label="Assumptions made" value={reasoning.assumptions} fullWidth />
          <Row label="When NOT to use" value={reasoning.when_opposite} fullWidth />
          <Row label="Lessons learned" value={reasoning.lessons} fullWidth />
          {reasoning.complexity && (
            <div style={{ padding: "10px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Complexity</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${reasoning.complexity >= n ? theme.blue : theme.borderInput}`, background: reasoning.complexity >= n ? theme.blueLight : theme.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: reasoning.complexity >= n ? theme.blue : theme.borderInput, fontSize: 12 }}>◆</span>
                  </div>
                ))}
                <span style={{ fontSize: 13, color: theme.textMuted, fontFamily: F }}>
                  {["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"][reasoning.complexity]}
                </span>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 6: Outcome ───────────────────────────────────────────── */}
      {outcome && (
        <Section title="Outcome" subtitle="Capture the post-build result and long-term usage signal" color="#059669" collapsible forceOpen={isPrinting}>
          <Row label="Did they build it" value={outcome.built ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1) : null} />
          <Row label="Block reason" value={outcome.block_reason} fullWidth />
          <Row label="What changed" value={outcome.changes} fullWidth />
          <Row label="What worked" value={outcome.what_worked} fullWidth />
          <Row label="What failed" value={outcome.what_failed} fullWidth />
          <Row label="Revisit when" value={outcome.revisit_when} fullWidth />
          {outcome.satisfaction && (
            <div style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
              <SatisfactionStars score={outcome.satisfaction} />
            </div>
          )}
          <Row label="Would recommend" value={outcome.recommend ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1) : null} />
        </Section>
      )}

      </div>{/* end fp-no-print screen view */}

    </div>

    {/* ── Workflow map — narrow screen modal ────────────────────────────── */}
    {mapWfIndex !== null && w < 1300 && build?.workflows?.[mapWfIndex] && (
      <WorkflowMapPanel
        workflow={build.workflows[mapWfIndex]}
        onClose={() => setMapWfIndex(null)}
        asModal
      />
    )}

    {/* ── Right sidebar ─────────────────────────────────────────────────── */}
    {w >= 1300 && (
      <div className="fp-no-print" style={{ width: 480, flexShrink: 0, position: "sticky", top: 24, paddingTop: 28, paddingBottom: 24, maxHeight: "calc(100vh - 48px)", overflowY: mapWfIndex !== null ? "hidden" : "auto" }}>

        {/* Workflow map panel */}
        {mapWfIndex !== null && build?.workflows?.[mapWfIndex] && (
          <WorkflowMapPanel
            workflow={build.workflows[mapWfIndex]}
            onClose={() => setMapWfIndex(null)}
          />
        )}

        {mapWfIndex !== null ? null : (
        <>

        {/* Project Updates */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "16px 16px 12px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>Project Updates</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Timestamped notes & attachments</p>
          </div>
          {!project_updates?.length
            ? <p style={{ fontSize: 12, color: theme.borderInput, fontFamily: F, textAlign: "center", padding: "12px 0", margin: 0 }}>No updates logged</p>
            : project_updates.map((pu, i) => {
                const dateLabel = pu.created_at
                  ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
                  : "—";
                return (
                  <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#0284C712", borderBottom: "1px solid #BAE6FD" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                      {pu.attachments?.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px", background: theme.surface }}>
                      {pu.content && <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                      {pu.attachments?.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {pu.attachments.map((att, ai) => att.url && (
                            <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "4px 12px", fontFamily: F, fontWeight: 500, textDecoration: "none" }}>
                              {att.name || att.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Scope Creep */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "16px 16px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>Scope Creep</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Unplanned additions to the build</p>
          </div>
          {!delta?.scope_creep?.length
            ? <p style={{ fontSize: 12, color: theme.borderInput, fontFamily: F, textAlign: "center", padding: "12px 0", margin: 0 }}>No scope creep logged</p>
            : delta.scope_creep.map((sc, i) => (
                <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#D9770612" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#D97706", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
                  {sc.reason && <Row label="Why added" value={sc.reason} fullWidth />}
                  {sc.impact && <Row label="Impact" value={sc.impact} fullWidth />}
                  {sc.communicated != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F,
                        color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                        background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                        border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                        borderRadius: 8, padding: "2px 10px" }}>
                        {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                      </span>
                    </div>
                  )}
                </div>
              ))
          }
        </div>

        </>)}

      </div>
    )}
  </div>
    {showShare && <ShareModal cf={cf} onClose={() => setShowShare(false)} />}
  </>
  );
}
