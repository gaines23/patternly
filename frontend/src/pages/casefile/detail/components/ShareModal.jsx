import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { useShareCaseFile } from "@hooks/useCaseFiles";
import { F, BLUE } from "../constants";

/**
 * Fixed-position modal for toggling the public share link and copying it.
 *
 * Manages its own mutation via useShareCaseFile — the parent only needs to
 * pass the case file object and an onClose callback.
 *
 * Props:
 *   cf      — case file object (needs cf.id, cf.share_enabled, cf.share_token)
 *   onClose — called when the backdrop or × button is clicked
 */
export default function ShareModal({ cf, onClose }) {
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
          maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Fraunces', serif" }}>Share client brief</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textFaint, lineHeight: 1 }}>×</button>
        </div>

        <p style={{ margin: "0 0 20px", fontSize: 13, color: theme.textMuted, fontFamily: F, lineHeight: 1.6 }}>
          Generate a read-only link you can send to your client for sign-off. The link shows the workspace blueprint without any internal notes or account details.
        </p>

        {/* Toggle row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontFamily: F, color: theme.textSec, fontWeight: 600 }}>Sharing</span>
          <button
            onClick={handleToggle}
            disabled={shareMutation.isPending}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: cf.share_enabled ? BLUE : "#D1D5DB",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
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

        {/* Copy URL row */}
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

        {/* Disabled state */}
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
