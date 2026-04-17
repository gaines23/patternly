import { createPortal } from "react-dom";
import { useTheme } from "../hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * DeleteConfirmModal
 *
 * Props:
 *   name       – the project/item name to display (string)
 *   onConfirm  – called when the user clicks "Delete"
 *   onCancel   – called when the user clicks "Cancel" or the backdrop
 *   isDeleting – disables buttons while the mutation is in flight
 */
export default function DeleteConfirmModal({ name, onConfirm, onCancel, isDeleting = false }) {
  const { theme } = useTheme();

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.surfaceRaised,
          borderRadius: 14,
          padding: "28px 28px 24px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "#FEF2F2", border: "1px solid #FECACA",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🗑️</span>
        </div>

        {/* Heading */}
        <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: F }}>
          Delete this project?
        </p>

        {/* Project name */}
        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#DC2626", fontFamily: F }}>
          "{name || "Untitled project"}"
        </p>

        {/* Warning body */}
        <p style={{ margin: "0 0 24px", fontSize: 13, color: theme.textMuted, fontFamily: F, lineHeight: 1.65 }}>
          This will permanently remove the project and all of its data — workflows, notes, and history. <strong style={{ color: theme.text }}>This cannot be undone.</strong>
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              padding: "10px 20px", borderRadius: 9,
              border: `1.5px solid ${theme.borderInput}`,
              background: theme.surfaceRaised,
              color: theme.textSec, fontSize: 13, fontWeight: 600,
              fontFamily: F, cursor: "pointer",
            }}
          >
            Keep it
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "10px 20px", borderRadius: 9,
              border: "none",
              background: isDeleting ? "#FCA5A5" : "#EF4444",
              color: "#fff", fontSize: 13, fontWeight: 700,
              fontFamily: F, cursor: isDeleting ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {isDeleting ? "Deleting…" : "Yes, delete it"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
