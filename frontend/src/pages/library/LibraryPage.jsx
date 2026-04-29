import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { useTheme } from "../../hooks/useTheme";
import { Card, PageHeader, Button, Badge, Input } from "@components/ui";
import { F, MONO, KIND_LABELS, KIND_ACCENT, KIND_OPTIONS } from "./constants";

const SORT_OPTIONS = [
  { value: "recent",  label: "Recently updated" },
  { value: "popular", label: "Most used" },
  { value: "alpha",   label: "A → Z" },
];

function KindBadge({ kind }) {
  const accent = KIND_ACCENT[kind] || KIND_ACCENT.snippet;
  return (
    <Badge variant="custom" bg={accent.bg} color={accent.color} border={`1px solid ${accent.border}`} size="xs">
      {KIND_LABELS[kind] || kind}
    </Badge>
  );
}

function ItemCard({ item, theme }) {
  const subtitle = [
    item.source_case_file_name && `from ${item.source_case_file_name}`,
    item.created_by_name,
  ].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/library/${item.id}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <Card
        variant="default"
        padding="16px"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <KindBadge kind={item.kind} />
            {item.platform?.name && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, fontFamily: F,
                color: theme.text, background: theme.surfaceAlt,
                border: `1px solid ${theme.border}`, borderRadius: 6,
                padding: "2px 8px", letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}>
                {item.platform.name}
              </span>
            )}
          </div>
          {item.usage_count > 0 && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: theme.textFaint, fontFamily: MONO }}>
              ↑ {item.usage_count}× used
            </span>
          )}
        </div>

        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: F, lineHeight: 1.3 }}>
            {item.name}
          </p>
          {item.description && (
            <p style={{
              margin: "4px 0 0", fontSize: 12.5, color: theme.textMuted, fontFamily: F, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {item.description}
            </p>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {(item.tags?.length > 0 || item.tools?.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {(item.tags || []).slice(0, 3).map(t => (
              <span key={`tag-${t}`} style={{
                fontFamily: MONO, fontSize: 10, color: theme.textSec,
                background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
                borderRadius: 4, padding: "1px 6px",
              }}>{t}</span>
            ))}
            {(item.tools || []).slice(0, 2).map(t => (
              <span key={`tool-${t}`} style={{
                fontFamily: MONO, fontSize: 10, color: theme.textSec,
                background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
                borderRadius: 4, padding: "1px 6px",
              }}>{t}</span>
            ))}
          </div>
        )}

        {subtitle && (
          <p style={{ margin: 0, fontSize: 11, color: theme.textFaint, fontFamily: F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {subtitle}
          </p>
        )}
      </Card>
    </Link>
  );
}

function FilterChip({ active, onClick, children, theme }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        fontSize: 12, fontWeight: 600, fontFamily: F,
        borderRadius: 999,
        border: `1px solid ${active ? theme.blueBorder : theme.border}`,
        background: active ? theme.blueLight : "transparent",
        color: active ? theme.blue : theme.textMuted,
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

export default function LibraryPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("");
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState("recent");

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const { data } = await api.get("/v1/briefs/platforms/");
      return Array.isArray(data) ? data : (data?.results || []);
    },
    staleTime: 5 * 60_000,
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim().length >= 2) p.set("search", search.trim());
    if (kind) p.set("kind", kind);
    if (platform) p.set("platform", platform);
    if (sort) p.set("sort", sort);
    return p.toString();
  }, [search, kind, platform, sort]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["library", queryString],
    queryFn: async () => {
      const { data } = await api.get(`/v1/library/items/${queryString ? `?${queryString}` : ""}`);
      return data;
    },
    staleTime: 15_000,
  });

  const items = data?.results || data || [];

  const grouped = useMemo(() => {
    if (kind) return { [kind]: items };
    const out = {};
    for (const it of items) {
      (out[it.kind] = out[it.kind] || []).push(it);
    }
    return out;
  }, [items, kind]);

  const orderedGroups = Object.keys(KIND_LABELS).filter(k => grouped[k]?.length);

  return (
    <div style={{ padding: "24px 32px 80px", maxWidth: 1280, margin: "0 auto" }}>
      <PageHeader
        title="Team Library"
        subtitle="Reusable formulas, automations, templates, and snippets — searchable and shareable across your team."
        action={
          <Link to="/library/new" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">+ New item</Button>
          </Link>
        }
      />

      <Card variant="default" padding="16px" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ flex: "1 1 240px", minWidth: 200 }}>
            <Input
              type="search"
              placeholder="Search name, description, tags, tools…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            style={{
              padding: "8px 12px", fontSize: 13, fontFamily: F,
              borderRadius: 8, border: `1px solid ${theme.border}`,
              background: theme.surface, color: theme.text, cursor: "pointer",
            }}
          >
            <option value="">All platforms</option>
            {platforms.map(p => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              padding: "8px 12px", fontSize: 13, fontFamily: F,
              borderRadius: 8, border: `1px solid ${theme.border}`,
              background: theme.surface, color: theme.text, cursor: "pointer",
            }}
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          <FilterChip active={!kind} onClick={() => setKind("")} theme={theme}>All</FilterChip>
          {KIND_OPTIONS.map(o => (
            <FilterChip key={o.value} active={kind === o.value} onClick={() => setKind(o.value)} theme={theme}>
              {o.label}
            </FilterChip>
          ))}
        </div>
      </Card>

      {isLoading ? (
        <p style={{ color: theme.textMuted, fontFamily: F }}>Loading…</p>
      ) : isError ? (
        <Card variant="default" padding="20px">
          <p style={{ margin: 0, color: theme.textMuted, fontFamily: F }}>Failed to load library items.</p>
        </Card>
      ) : items.length === 0 ? (
        <Card variant="default" padding="40px" style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.text, fontFamily: F }}>No items yet</p>
          <p style={{ margin: "6px 0 16px", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            Create one from scratch, or open any project and use “Save to Library” on an automation, formula, or build block.
          </p>
          <Link to="/library/new" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">+ New item</Button>
          </Link>
        </Card>
      ) : (
        orderedGroups.map(group => (
          <div key={group} style={{ marginBottom: 24 }}>
            <p style={{
              margin: "0 0 10px", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: theme.textFaint, fontFamily: F,
            }}>
              {KIND_LABELS[group]} · {grouped[group].length}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 14,
            }}>
              {grouped[group].map(item => (
                <ItemCard key={item.id} item={item} theme={theme} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
