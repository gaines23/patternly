import { useState, useRef } from "react";
import { useTheme } from "@hooks/useTheme";
import { usePlatforms, useIngestUrl, useIngestPdf, useIngestYouTube } from "../../hooks/useIngest";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";

const F = "'Plus Jakarta Sans', sans-serif";

const INPUT_MODES = [
  { value: "url", label: "URL" },
  { value: "youtube", label: "YouTube" },
  { value: "prompt", label: "Paste Content" },
  { value: "pdf", label: "Upload PDF" },
];

const INGEST_TYPES_URL = [
  { value: "knowledge", label: "Platform Knowledge & Insights", description: "Docs, guides, methodologies, limitations, best practices" },
  { value: "case_file", label: "Case File", description: "A specific workflow implementation or build story" },
];

const CONTENT_TYPES = [
  { value: "blog_post", label: "Blog Post" },
  { value: "platform_doc", label: "Platform Documentation" },
  { value: "community_post", label: "Community Post / Forum" },
  { value: "integration_doc", label: "Integration Documentation" },
  { value: "case_study", label: "Case Study" },
  { value: "changelog", label: "Changelog / Release Notes" },
];

/**
 * Reusable ingest form. Used in /ingest (standalone) and inside /patterns (as a tab).
 * wrapInCard=false removes the outer Card so the parent page can control the shell.
 */
export default function IngestForm({ wrapInCard = true, onSuccess }) {
  const { theme } = useTheme();
  const { data: platforms, isLoading: platformsLoading } = usePlatforms();
  const ingestMutation = useIngestUrl();
  const pdfMutation = useIngestPdf();
  const ytMutation = useIngestYouTube();

  const [inputMode, setInputMode] = useState("url");
  const [url, setUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [content, setContent] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [platformSlug, setPlatformSlug] = useState("");
  const [ingestType, setIngestType] = useState("knowledge");
  const [contentType, setContentType] = useState("blog_post");
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const isLoading = ingestMutation.isPending || pdfMutation.isPending || ytMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setError(null);

    if (!platformSlug) return;

    try {
      let data;

      if (inputMode === "youtube") {
        if (!youtubeUrl.trim()) return;
        data = await ytMutation.mutateAsync({
          url: youtubeUrl.trim(),
          platform: platformSlug,
          source_attribution: sourceAttribution,
        });
        setYoutubeUrl("");
      } else if (inputMode === "pdf") {
        if (!pdfFile) return;
        data = await pdfMutation.mutateAsync({
          file: pdfFile,
          platform: platformSlug,
          sourceAttribution,
        });
      } else {
        const payload = {
          platform: platformSlug,
          ingest_type: inputMode === "prompt" ? "prompt" : ingestType,
          content_type: contentType,
          source_attribution: sourceAttribution,
        };
        if (inputMode === "url") {
          if (!url.trim()) return;
          payload.url = url.trim();
        } else {
          if (!content.trim()) return;
          payload.content = content.trim();
          if (url.trim()) payload.url = url.trim();
        }
        data = await ingestMutation.mutateAsync(payload);
      }

      setResult(data);
      if (inputMode === "pdf") {
        setPdfFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      if (onSuccess) onSuccess(data);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.url?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        "Ingestion failed. Please try again.";
      setError(detail);
    }
  };

  const selectStyle = {
    width: "100%",
    padding: "11px 14px",
    border: `1.5px solid ${theme.borderInput}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: F,
    color: theme.text,
    background: theme.inputBg,
    outline: "none",
    boxSizing: "border-box",
    cursor: "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B7280' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 14px center",
    paddingRight: 36,
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text,
    fontFamily: F,
    marginBottom: 4,
    display: "block",
  };

  const pillStyle = (active) => ({
    padding: "7px 16px",
    border: `1.5px solid ${active ? theme.blue : theme.borderInput}`,
    borderRadius: 20,
    background: active ? theme.blueLight : "transparent",
    color: active ? theme.blue : theme.textMuted,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: F,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  const cardButtonStyle = (active) => ({
    flex: 1,
    padding: "12px 14px",
    border: `1.5px solid ${active ? theme.blue : theme.borderInput}`,
    borderRadius: 10,
    background: active ? theme.blueLight : theme.inputBg,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: F,
    transition: "border-color 0.15s, background 0.15s",
  });

  const groupedPlatforms = {};
  if (platforms) {
    for (const p of platforms) {
      const cat = p.category;
      if (!groupedPlatforms[cat]) groupedPlatforms[cat] = [];
      groupedPlatforms[cat].push(p);
    }
  }

  const categoryLabels = {
    pm: "Project Management",
    automation: "Automation / Integration",
    database: "Database / No-Code",
    crm: "CRM",
    integration_app: "Integration App",
    other: "Other",
  };

  const canSubmit =
    platformSlug &&
    !isLoading &&
    (inputMode === "url" ? url.trim()
      : inputMode === "youtube" ? youtubeUrl.trim()
      : inputMode === "prompt" ? content.trim()
      : !!pdfFile);

  const formContent = (
    <>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {INPUT_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setInputMode(m.value)}
              style={pillStyle(inputMode === m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {inputMode === "url" && (
          <Input
            label="Source URL"
            type="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.zenpilot.com/blog/..."
            required
            helper="Blog post, documentation page, forum thread, or case study"
          />
        )}

        {inputMode === "youtube" && (
          <>
            <Input
              label="YouTube URL or Video ID"
              type="text"
              name="youtube_url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or video ID"
              required
              helper="The transcript will be fetched automatically and extracted"
            />
            <Input
              label="Attribution (optional)"
              name="source_attribution"
              value={sourceAttribution}
              onChange={(e) => setSourceAttribution(e.target.value)}
              placeholder="e.g. ZenPilot, ClickUp"
              helper="Channel or creator name"
            />
          </>
        )}

        {inputMode === "prompt" && (
          <>
            <Input
              as="textarea"
              label="Content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste documentation, transcript, blog post content, notes, or any text about workflow tools..."
              required
              rows={10}
              helper="The AI will extract platform knowledge, community insights, and case files from this content"
            />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Source URL (optional)"
                  type="url"
                  name="source_url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  helper="Where this content came from"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Attribution (optional)"
                  name="source_attribution"
                  value={sourceAttribution}
                  onChange={(e) => setSourceAttribution(e.target.value)}
                  placeholder="e.g. ZenPilot, ClickUp Docs"
                  helper="Author or organization"
                />
              </div>
            </div>
          </>
        )}

        {inputMode === "pdf" && (
          <>
            <div>
              <span style={labelStyle}>
                PDF File <span style={{ color: "#DC2626" }}>*</span>
              </span>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${pdfFile ? theme.blue : theme.borderInput}`,
                  borderRadius: 10,
                  padding: "24px 16px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: pdfFile ? theme.blueLight : theme.inputBg,
                  transition: "all 0.15s",
                }}
              >
                {pdfFile ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>
                      {pdfFile.name}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: F, marginTop: 4 }}>
                      {(pdfFile.size / 1024).toFixed(0)} KB — Click to change
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24, marginBottom: 4 }}>+</div>
                    <div style={{ fontSize: 13, color: theme.textMuted, fontFamily: F }}>
                      Click to select a PDF file (max 10 MB)
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setPdfFile(file);
                  }}
                />
              </div>
            </div>
            <Input
              label="Attribution (optional)"
              name="source_attribution"
              value={sourceAttribution}
              onChange={(e) => setSourceAttribution(e.target.value)}
              placeholder="e.g. ZenPilot, ClickUp Docs"
              helper="Author or organization name for this PDF"
            />
          </>
        )}

        {inputMode === "url" && (
          <div>
            <span style={labelStyle}>What type of data is this?</span>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {INGEST_TYPES_URL.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setIngestType(t.value)}
                  style={cardButtonStyle(ingestType === t.value)}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 2 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>
                    {t.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle} htmlFor="platform">
            Primary Platform <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <select
            id="platform"
            value={platformSlug}
            onChange={(e) => setPlatformSlug(e.target.value)}
            required
            style={selectStyle}
            disabled={platformsLoading}
          >
            <option value="">Select a platform...</option>
            {Object.entries(groupedPlatforms).map(([cat, plats]) => (
              <optgroup key={cat} label={categoryLabels[cat] || cat}>
                {plats.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {inputMode === "url" && (
          <div>
            <label style={labelStyle} htmlFor="content_type">Content Type</label>
            <select
              id="content_type"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              style={selectStyle}
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="submit"
          loading={isLoading}
          disabled={!canSubmit}
          fullWidth
          size="lg"
        >
          {isLoading
            ? "Extracting..."
            : inputMode === "pdf"
              ? "Upload & Extract"
              : inputMode === "youtube"
                ? "Fetch Transcript & Extract"
                : inputMode === "prompt"
                  ? "Extract & Store"
                  : "Ingest Source"}
        </Button>

        {(inputMode === "prompt" || inputMode === "pdf" || inputMode === "youtube") && (
          <p style={{ fontSize: 12, color: theme.textMuted, fontFamily: F, margin: 0, textAlign: "center" }}>
            The AI will automatically classify each piece of information as platform knowledge,
            community insight, or case file and store it in the correct place.
          </p>
        )}
      </form>

      {error && (
        <Alert variant="error" onDismiss={() => setError(null)} style={{ marginTop: 16 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert variant="success" onDismiss={() => setResult(null)} style={{ marginTop: 16 }}>
          <strong>Ingested successfully.</strong>
          <br />
          Platform: {result.platform}
          {result.video_id && <> | Video: {result.video_id}</>}
          {result.filename && <> | File: {result.filename}</>}
          {result.pages_extracted != null && <> | {result.pages_extracted} pages</>}
          {result.characters_extracted != null && <> | {result.characters_extracted.toLocaleString()} chars extracted</>}
          {result.output && (
            <pre style={{
              marginTop: 8,
              fontSize: 12,
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              color: "inherit",
              background: "rgba(0,0,0,0.04)",
              padding: 8,
              borderRadius: 6,
              maxHeight: 200,
              overflow: "auto",
            }}>
              {result.output}
            </pre>
          )}
        </Alert>
      )}
    </>
  );

  return wrapInCard ? <Card>{formContent}</Card> : formContent;
}
