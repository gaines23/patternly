import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { useTheme } from "../../hooks/useTheme";
import { Card, PageHeader, Button, Input } from "@components/ui";
import { F, KIND_LABELS, KIND_OPTIONS } from "./constants";
import LibraryBodyEditor from "./LibraryBodyEditor";

export default function LibraryNewPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [kind, setKind] = useState("formula");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [body, setBody] = useState({});
  const [error, setError] = useState("");

  const createMut = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post("/v1/library/items/", payload);
      return data;
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ["library"] });
      navigate(`/library/${item.id}`);
    },
    onError: (e) => {
      setError(e?.response?.data?.detail || "Failed to create item.");
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setError("");
    createMut.mutate({
      kind,
      name: name.trim(),
      description: description.trim(),
      body,
      tags: tagsText.split(",").map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div style={{ padding: "24px 32px 80px", maxWidth: 800, margin: "0 auto" }}>
      <PageHeader
        title="New Library Item"
        subtitle="Add a reusable building block your team can find later."
        action={<Link to="/library" style={{ textDecoration: "none", color: theme.textMuted, fontFamily: F, fontSize: 13 }}>← Back to Library</Link>}
      />

      <form onSubmit={onSubmit}>
        <Card variant="default" padding="20px" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 6 }}>Kind</label>
              <select
                value={kind}
                onChange={(e) => { setKind(e.target.value); setBody({}); }}
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
              placeholder={`e.g. "Days since last activity"`}
              value={name}
              onChange={e => setName(e.target.value)}
            />

            <Input
              as="textarea"
              label="Description"
              placeholder="What does this do? When should someone use it?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />

            <Input
              label="Tags"
              helper="Comma-separated. Used for filtering and discovery."
              placeholder="reporting, deadlines, finance"
              value={tagsText}
              onChange={e => setTagsText(e.target.value)}
            />
          </div>
        </Card>

        <Card variant="default" padding="20px" style={{ marginBottom: 16 }}>
          <p style={{
            margin: "0 0 12px", fontSize: 11, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: theme.textFaint, fontFamily: F,
          }}>
            {KIND_LABELS[kind]} body
          </p>
          <LibraryBodyEditor kind={kind} value={body} onChange={setBody} />
        </Card>

        {error && (
          <p style={{ margin: "0 0 12px", color: "#DC2626", fontFamily: F, fontSize: 13 }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Link to="/library" style={{ textDecoration: "none" }}>
            <Button variant="ghost" size="md">Cancel</Button>
          </Link>
          <Button variant="primary" size="md" type="submit" loading={createMut.isPending}>
            Create item
          </Button>
        </div>
      </form>
    </div>
  );
}
