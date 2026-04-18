import { useState } from "react";
import { useTheme } from "@hooks/useTheme";
import { usePlatforms, useIngestUrl } from "../../hooks/useIngest";
import PageHeader from "../../components/ui/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Alert from "../../components/ui/Alert";

const F = "'Plus Jakarta Sans', sans-serif";

const INGEST_TYPES = [
  { value: "knowledge", label: "Platform Knowledge & Community Insights", description: "Docs, guides, methodologies, limitations, best practices" },
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

export default function IngestPage() {
  const { theme } = useTheme();
  const { data: platforms, isLoading: platformsLoading } = usePlatforms();
  const ingestMutation = useIngestUrl();

  const [url, setUrl] = useState("");
  const [platformSlug, setPlatformSlug] = useState("");
  const [ingestType, setIngestType] = useState("knowledge");
  const [contentType, setContentType] = useState("blog_post");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setError(null);

    if (!url.trim() || !platformSlug) return;

    try {
      const data = await ingestMutation.mutateAsync({
        url: url.trim(),
        platform: platformSlug,
        ingest_type: ingestType,
        content_type: contentType,
      });
      setResult(data);
      setUrl("");
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.url?.[0] || "Ingestion failed. Please try again.";
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

  // Group platforms by category for the dropdown
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

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <PageHeader
        title="Ingest Source"
        subtitle="Add platform knowledge, community insights, or case files from public sources"
      />

      <Card>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* URL */}
          <Input
            label="Source URL"
            type="url"
            name="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.zenpilot.com/blog/..."
            required
            helper="Paste a blog post, documentation page, forum thread, or case study URL"
          />

          {/* Ingest type — radio cards */}
          <div>
            <span style={labelStyle}>What type of data is this?</span>
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              {INGEST_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setIngestType(t.value)}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    border: `1.5px solid ${ingestType === t.value ? theme.blue : theme.borderInput}`,
                    borderRadius: 10,
                    background: ingestType === t.value ? theme.blueLight : theme.inputBg,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: F,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
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

          {/* Platform */}
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

          {/* Content type */}
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

          {/* Submit */}
          <Button
            type="submit"
            loading={ingestMutation.isPending}
            disabled={!url.trim() || !platformSlug}
            fullWidth
            size="lg"
          >
            {ingestMutation.isPending ? "Extracting..." : "Ingest Source"}
          </Button>
        </form>

        {/* Results */}
        {error && (
          <Alert variant="error" onDismiss={() => setError(null)} style={{ marginTop: 16 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Alert variant="success" onDismiss={() => setResult(null)} style={{ marginTop: 16 }}>
            <strong>Ingested successfully.</strong>
            <br />
            Platform: {result.platform} | Type: {result.ingest_type}
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
      </Card>
    </div>
  );
}
