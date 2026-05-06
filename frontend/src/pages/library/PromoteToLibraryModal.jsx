import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useTheme } from "../../hooks/useTheme";
import { Button, Card, Input } from "@components/ui";
import { F, KIND_OPTIONS } from "./constants";

/**
 * Modal for promoting a fragment of a project's build into a Library item.
 * Caller passes the case_file id, source_layer, suggested kind/name/body/tags.
 *
 * Design note: this is intentionally a simple form. The user can adjust the
 * name/description before saving — the backend records `source_case_file` so
 * provenance is preserved without bothering the user.
 */
export default function PromoteToLibraryModal({
  open,
  onClose,
  caseFileId,
  sourceLayer,
  sourcePath = "",
  suggestedKind = "snippet",
  suggestedName = "",
  suggestedBody = {},
  suggestedTags = [],
}) {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [kind, setKind] = useState(suggestedKind);
  const [name, setName] = useState(suggestedName);
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState(suggestedTags.join(", "));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setKind(suggestedKind);
      setName(suggestedName);
      setDescription("");
      setTagsText(suggestedTags.join(", "));
      setError("");
    }
  }, [open, suggestedKind, suggestedName, suggestedTags]);

  const promoteMut = useMutation({
    mutationFn: (payload) => api.post("/v1/library/items/promote/", payload),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      onClose();
      navigate(`/library/${data.id}`);
    },
    onError: (e) => {
      setError(e?.response?.data?.detail || "Could not save to library.");
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError("");
    promoteMut.mutate({
      case_file: caseFileId,
      source_layer: sourceLayer,
      source_path: sourcePath,
      kind,
      name: name.trim(),
      description: description.trim(),
      body: suggestedBody,
      tags: tagsText.split(",").map(s => s.trim()).filter(Boolean),
    });
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <Card
        variant="elevated"
        padding="0"
        style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "20px 22px", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: F }}>
            Save to Library
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            Make this reusable for the rest of your team.
          </p>
        </div>

        <form onSubmit={submit} style={{ padding: "20px 22px", display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 6 }}>Kind</label>
            <select
              value={kind}
              onChange={e => setKind(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14, fontFamily: F,
                borderRadius: 8, border: `1.5px solid ${theme.borderInput}`,
                background: theme.inputBg, color: theme.text, cursor: "pointer",
              }}
            >
              {KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <Input
            label="Name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <Input
            as="textarea"
            label="Description"
            placeholder="When should someone use this?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />

          <Input
            label="Tags"
            helper="Comma-separated"
            value={tagsText}
            onChange={e => setTagsText(e.target.value)}
          />

          {error && <p style={{ margin: 0, color: "#DC2626", fontFamily: F, fontSize: 13 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <Button variant="ghost" size="md" onClick={onClose} type="button">Cancel</Button>
            <Button variant="primary" size="md" type="submit" loading={promoteMut.isPending}>
              Save to Library
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
