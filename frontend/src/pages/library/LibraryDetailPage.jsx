import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { Card, PageHeader, Button, Badge, Input } from "@components/ui";
import { F, MONO, KIND_LABELS, KIND_ACCENT, SOURCE_LAYER_LABELS } from "./constants";
import LibraryBodyEditor from "./LibraryBodyEditor";

function KindBadge({ kind }) {
  const accent = KIND_ACCENT[kind] || KIND_ACCENT.snippet;
  return (
    <Badge variant="custom" bg={accent.bg} color={accent.color} border={`1px solid ${accent.border}`} size="sm">
      {KIND_LABELS[kind] || kind}
    </Badge>
  );
}

function BodyView({ kind, body, theme }) {
  if (!body || Object.keys(body).length === 0) {
    return <p style={{ margin: 0, color: theme.textFaint, fontFamily: F, fontSize: 13 }}>No body yet.</p>;
  }

  const Row = ({ label, value, mono }) => value ? (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: theme.textFaint, fontFamily: F }}>
        {label}
      </p>
      <pre style={{
        margin: 0, padding: "10px 12px",
        background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
        borderRadius: 8, color: theme.text,
        fontFamily: mono ? MONO : F,
        fontSize: 13, lineHeight: 1.6,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>{value}</pre>
    </div>
  ) : null;

  if (kind === "formula") {
    return (
      <>
        <Row label="Expression" value={body.expression} mono />
        <Row label="Inputs" value={body.inputs} />
        <Row label="Output" value={body.output} />
      </>
    );
  }
  if (kind === "automation") {
    // Prefer the renamed `instructions` field; fall back to legacy `notes`.
    const instructions = body.instructions ?? body.notes;
    return (
      <>
        <Row label="Trigger" value={body.trigger} />
        <Row label="Conditions" value={body.conditions} />
        <Row label="Actions" value={body.actions} />
        <Row label="Instructions" value={instructions} mono />
      </>
    );
  }
  if (kind === "custom_field_set") {
    return <Row label="Fields" value={body.fields_text} mono />;
  }
  if (kind === "template") {
    return (
      <>
        <Row label="Summary" value={body.summary} />
        <Row label="Steps" value={body.steps} />
        <Row label="Links" value={body.links} />
      </>
    );
  }
  if (kind === "integration_recipe") {
    return (
      <>
        <Row label="Source" value={body.source} />
        <Row label="Destination" value={body.destination} />
        <Row label="Mapping" value={body.mapping} />
        <Row label="Notes" value={body.notes} />
      </>
    );
  }
  // snippet — and fallback for arbitrary promoted bodies
  if (body.content) return <Row label="Content" value={body.content} mono />;
  return (
    <pre style={{
      margin: 0, padding: "10px 12px",
      background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
      borderRadius: 8, color: theme.text, fontFamily: MONO, fontSize: 12.5, lineHeight: 1.6,
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>{JSON.stringify(body, null, 2)}</pre>
  );
}

function CommentsPanel({ itemId, theme }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ["library", itemId, "comments"],
    queryFn: async () => {
      const { data } = await api.get(`/v1/library/items/${itemId}/comments/`);
      return data?.results || data || [];
    },
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post(`/v1/library/items/${itemId}/comments/`, { body }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["library", itemId, "comments"] });
      qc.invalidateQueries({ queryKey: ["library", itemId] });
    },
  });

  const patchMut = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/v1/library/items/${itemId}/comments/${id}/`, { body }),
    onSuccess: () => {
      setEditingId(null);
      setEditingText("");
      qc.invalidateQueries({ queryKey: ["library", itemId, "comments"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/v1/library/items/${itemId}/comments/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library", itemId, "comments"] });
      qc.invalidateQueries({ queryKey: ["library", itemId] });
    },
  });

  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    createMut.mutate(draft.trim());
  };

  return (
    <div>
      <p style={{
        margin: "0 0 10px", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: theme.textFaint, fontFamily: F,
      }}>
        Comments · {comments.length}
        <span style={{ marginLeft: 8, fontWeight: 500, textTransform: "none", letterSpacing: 0, color: theme.textFaint }}>
          (visible here only — not shown on the source project)
        </span>
      </p>

      <form onSubmit={submit} style={{ marginBottom: 16 }}>
        <Input
          as="textarea"
          placeholder="Add a comment for your team — gotchas, when to use, edits, etc."
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button variant="primary" size="sm" type="submit" loading={createMut.isPending} disabled={!draft.trim()}>
            Post comment
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: theme.textFaint, fontFamily: F }}>No comments yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {comments.map(c => {
            const isAuthor = user && (c.author === user.id);
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} style={{
                padding: "12px 14px",
                border: `1px solid ${theme.border}`, borderRadius: 10,
                background: theme.surface,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: F }}>
                    {c.author_name || c.author_email || "Unknown"}
                  </span>
                  <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                {isEditing ? (
                  <>
                    <Input as="textarea" value={editingText} onChange={e => setEditingText(e.target.value)} rows={3} />
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditingText(""); }}>Cancel</Button>
                      <Button variant="primary" size="sm" onClick={() => patchMut.mutate({ id: c.id, body: editingText })} loading={patchMut.isPending}>Save</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 13.5, color: theme.text, fontFamily: F, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{c.body}</p>
                    {isAuthor && (
                      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                        <button onClick={() => { setEditingId(c.id); setEditingText(c.body); }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: theme.textMuted, fontFamily: F, fontSize: 12 }}>
                          Edit
                        </button>
                        <button onClick={() => { if (confirm("Delete this comment?")) deleteMut.mutate(c.id); }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#DC2626", fontFamily: F, fontSize: 12 }}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LibraryDetailPage() {
  const { id } = useParams();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ["library", id],
    queryFn: async () => {
      const { data } = await api.get(`/v1/library/items/${id}/`);
      return data;
    },
  });

  const patchMut = useMutation({
    mutationFn: (payload) => api.patch(`/v1/library/items/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      setEditing(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/v1/library/items/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      navigate("/library");
    },
  });

  const useMut = useMutation({
    mutationFn: () => api.post(`/v1/library/items/${id}/use/`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library", id] }),
  });

  const copyToClipboard = async () => {
    if (!item) return;
    const text = stringifyBody(item.kind, item.body);
    try {
      await navigator.clipboard.writeText(text);
      useMut.mutate();
    } catch {
      // ignore
    }
  };

  if (isLoading) return <div style={{ padding: 32, fontFamily: F }}>Loading…</div>;
  if (isError || !item) return <div style={{ padding: 32, fontFamily: F }}>Not found.</div>;

  const startEdit = () => {
    setDraft({
      name: item.name,
      description: item.description || "",
      tags: (item.tags || []).join(", "),
      body: item.body || {},
    });
    setEditing(true);
  };

  const saveEdit = () => {
    patchMut.mutate({
      name: draft.name.trim(),
      description: draft.description.trim(),
      tags: draft.tags.split(",").map(s => s.trim()).filter(Boolean),
      body: draft.body,
    });
  };

  return (
    <div style={{ padding: "24px 32px 80px", maxWidth: 960, margin: "0 auto" }}>
      <Link to="/library" style={{ textDecoration: "none", color: theme.textMuted, fontFamily: F, fontSize: 13 }}>
        ← Back to Library
      </Link>

      <PageHeader
        title={item.name}
        subtitle={item.description}
        action={
          editing ? (
            <>
              <Button variant="ghost" size="md" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="md" onClick={saveEdit} loading={patchMut.isPending}>Save</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => { if (confirm("Delete this library item?")) deleteMut.mutate(); }}>Delete</Button>
              <Button variant="secondary" size="md" onClick={startEdit}>Edit</Button>
              <Button variant="primary" size="md" onClick={copyToClipboard}>Copy</Button>
            </>
          )
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <KindBadge kind={item.kind} />
        {item.platform?.name && (
          <Badge variant="custom" bg={theme.surfaceAlt} color={theme.textSec} border={`1px solid ${theme.border}`} size="sm">
            {item.platform.name}
          </Badge>
        )}
        <Badge variant="custom" bg={theme.surfaceAlt} color={theme.textFaint} border={`1px solid ${theme.border}`} size="sm">
          v{item.version}
        </Badge>
        {item.usage_count > 0 && (
          <Badge variant="custom" bg={theme.surfaceAlt} color={theme.textFaint} border={`1px solid ${theme.border}`} size="sm">
            Used {item.usage_count}× by team
          </Badge>
        )}
        {(item.tags || []).map(t => (
          <span key={t} style={{
            fontFamily: MONO, fontSize: 11, color: theme.textSec,
            background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
            borderRadius: 4, padding: "2px 8px",
          }}>{t}</span>
        ))}
      </div>

      {item.source_case_file && (() => {
        const parsed = parseSourcePath(item.source_path);
        const editHref = buildEditDeepLink(item.source_case_file, parsed);
        return (
          <Card variant="default" padding="14px 16px" style={{ marginBottom: 16, background: theme.surfaceAlt }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 12.5, color: theme.textMuted, fontFamily: F }}>
                Promoted from project{" "}
                <Link to={`/projects/${item.source_case_file}`} style={{ color: theme.blue, fontWeight: 600, textDecoration: "none" }}>
                  {item.source_case_file_name || "View project"}
                </Link>
                {item.source_layer && (
                  <span style={{ marginLeft: 6, color: theme.textFaint }}>
                    · {SOURCE_LAYER_LABELS[item.source_layer] || item.source_layer}
                  </span>
                )}
              </p>
              {editHref && (
                <Link
                  to={editHref}
                  style={{
                    fontSize: 11.5, fontWeight: 600, fontFamily: F,
                    color: "#6D28D9", background: "#F5F3FF",
                    border: "1px solid #DDD6FE", borderRadius: 6,
                    padding: "4px 10px", textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  ↗ Edit in project
                </Link>
              )}
            </div>
          </Card>
        );
      })()}

      <Card variant="default" padding="20px" style={{ marginBottom: 16 }}>
        {editing ? (
          <div style={{ display: "grid", gap: 14 }}>
            <Input label="Name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required />
            <Input as="textarea" label="Description" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2} />
            <Input label="Tags" value={draft.tags} onChange={e => setDraft({ ...draft, tags: e.target.value })} helper="Comma-separated" />
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textFaint, fontFamily: F }}>
                {KIND_LABELS[item.kind]} body
              </p>
              <LibraryBodyEditor
                kind={item.kind}
                value={draft.body}
                onChange={(b) => setDraft({ ...draft, body: b })}
              />
            </div>
          </div>
        ) : (
          <BodyView kind={item.kind} body={item.body} theme={theme} />
        )}
      </Card>

      <Card variant="default" padding="20px">
        <CommentsPanel itemId={id} theme={theme} />
      </Card>
    </div>
  );
}

function parseSourcePath(path) {
  if (!path || typeof path !== "string") return null;
  const m = path.match(/workflows\[(\d+)\](?:\.lists\[(\d+)\](?:\.(automations|custom_fields)(?:\[(\d+)\])?)?)?/);
  if (!m) return null;
  return {
    workflow: Number(m[1]),
    list: m[2] !== undefined ? Number(m[2]) : null,
    section: m[3] || null,            // "automations" | "custom_fields" | null
    automation: m[4] !== undefined ? Number(m[4]) : null,
  };
}

function buildEditDeepLink(caseFileId, parsed) {
  if (!caseFileId || !parsed) return null;
  const params = new URLSearchParams();
  params.set("workflow", String(parsed.workflow));
  if (parsed.list !== null) params.set("list", String(parsed.list));
  if (parsed.automation !== null) params.set("automation", String(parsed.automation));
  return `/projects/${caseFileId}/edit?${params.toString()}`;
}

function stringifyBody(kind, body) {
  if (!body) return "";
  if (kind === "formula") return body.expression || "";
  if (kind === "snippet") return body.content || "";
  if (kind === "automation") {
    const instructions = body.instructions ?? body.notes;
    return [
      body.trigger && `Trigger: ${body.trigger}`,
      body.conditions && `Conditions:\n${body.conditions}`,
      body.actions && `Actions:\n${body.actions}`,
      instructions && `Instructions:\n${instructions}`,
    ].filter(Boolean).join("\n\n");
  }
  return JSON.stringify(body, null, 2);
}
