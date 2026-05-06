import { useState } from "react";
import PromoteToLibraryModal from "./PromoteToLibraryModal";
import { F } from "./constants";

/**
 * Inline pill-button that opens the Promote modal. Caller passes the same
 * props the modal needs.
 */
export default function PromoteToLibraryButton({
  caseFileId,
  sourceLayer,
  sourcePath,
  suggestedKind,
  suggestedName,
  suggestedBody,
  suggestedTags,
  size = "sm",
  label = "↑ Save to Library",
  style = {},
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={{
          fontSize: size === "xs" ? 10.5 : 11,
          fontWeight: 600,
          fontFamily: F,
          color: "#6D28D9",
          background: "#F5F3FF",
          border: "1px solid #DDD6FE",
          borderRadius: 6,
          padding: size === "xs" ? "2px 8px" : "3px 10px",
          cursor: "pointer",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#EDE9FE"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "#F5F3FF"; }}
      >
        {label}
      </button>
      <PromoteToLibraryModal
        open={open}
        onClose={() => setOpen(false)}
        caseFileId={caseFileId}
        sourceLayer={sourceLayer}
        sourcePath={sourcePath}
        suggestedKind={suggestedKind}
        suggestedName={suggestedName}
        suggestedBody={suggestedBody}
        suggestedTags={suggestedTags}
      />
    </>
  );
}
