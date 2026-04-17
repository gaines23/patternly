import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { useShareProject, useClientShareProject } from "@hooks/useProjects";
import { F, BLUE } from "../constants";

function ShareToggleRow({ label, description, isEnabled, isPending, onToggle, shareUrl, color = BLUE }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${theme.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontFamily: F, color: theme.text, fontWeight: 600, flex: 1 }}>{label}</span>
        <button
          onClick={onToggle}
          disabled={isPending}
          style={{
            width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
            background: isEnabled ? color : "#D1D5DB",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}
        >
          <span style={{
            position: "absolute", top: 3, left: isEnabled ? 22 : 3,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s", display: "block",
          }} />
        </button>
        <span style={{ fontSize: 12, fontFamily: F, color: isEnabled ? "#059669" : "#9CA3AF", width: 36 }}>
          {isEnabled ? "On" : "Off"}
        </span>
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: theme.textFaint, fontFamily: F, lineHeight: 1.5 }}>
        {description}
      </p>
      {isEnabled && shareUrl && (
        <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <input
            readOnly
            value={shareUrl}
            style={{
              flex: 1, fontFamily: F, fontSize: 11, color: theme.textSec,
              border: `1.5px solid ${theme.borderInput}`, borderRadius: 8, padding: "8px 10px",
              background: theme.inputBgDisabled, outline: "none",
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: copied ? "#059669" : color,
              color: "#fff", fontSize: 12, fontWeight: 600,
              fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
              transition: "background 0.2s",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ShareModal({ cf, onClose }) {
  const { theme } = useTheme();
  const shareMutation = useShareProject(cf.id);
  const clientShareMutation = useClientShareProject(cf.id);

  const fullShareUrl = cf.share_token
    ? `${window.location.origin}/brief/${cf.share_token}`
    : null;

  const clientShareUrl = cf.client_share_token
    ? `${window.location.origin}/client-brief/${cf.client_share_token}`
    : null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.surfaceRaised, borderRadius: 16, padding: "28px 32px",
          maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Fraunces', serif" }}>Share project</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textFaint, lineHeight: 1 }}>x</button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: theme.textMuted, fontFamily: F, lineHeight: 1.6 }}>
          Generate read-only links to share with your team or clients.
        </p>

        {/* Client view — progress overview only */}
        <ShareToggleRow
          label="Client view"
          description="Shares only the progress overview summary. Ideal for client-facing updates."
          isEnabled={cf.client_share_enabled}
          isPending={clientShareMutation.isPending}
          onToggle={() => clientShareMutation.mutate()}
          shareUrl={clientShareUrl}
          color="#6366F1"
        />

        {/* Full brief */}
        <ShareToggleRow
          label="Full brief"
          description="Shares the complete workspace blueprint — all layers, notes, and build details."
          isEnabled={cf.share_enabled}
          isPending={shareMutation.isPending}
          onToggle={() => shareMutation.mutate()}
          shareUrl={fullShareUrl}
          color={BLUE}
        />

        {/* Hint */}
        {!cf.share_enabled && !cf.client_share_enabled && (
          <div style={{ padding: "14px", background: theme.surfaceAlt, borderRadius: 8, border: `1px solid ${theme.borderInput}`, marginTop: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: theme.textFaint, fontFamily: F }}>
              Enable a link above to start sharing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
