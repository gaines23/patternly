import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { useTheme } from "../../hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

// Route → human label for the breadcrumb leaf.
const ROUTE_LABELS = [
  [/^\/dashboard$/,            "Overview"],
  [/^\/projects$/,             "My Projects"],
  [/^\/projects\/new$/,        "New Project"],
  [/^\/projects\/[^/]+\/edit$/,"Edit Project"],
  [/^\/projects\/[^/]+$/,      "Project"],
  [/^\/tasks$/,                "Tasks"],
  [/^\/ingest$/,               "Ingest"],
  [/^\/patterns$/,             "Patterns"],
  [/^\/generate$/,             "Generate brief"],
  [/^\/settings/,              "Settings"],
];

function resolveLabel(pathname) {
  for (const [re, label] of ROUTE_LABELS) {
    if (re.test(pathname)) return label;
  }
  return "Workspace";
}

function SearchIcon({ size = 13, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>
    </svg>
  );
}

export default function TopBar() {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const leaf = resolveLabel(location.pathname);

  // ⌘K / Ctrl+K focuses the search input
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Click outside closes the dropdown
  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setOpen(false); setQuery(""); }, [location.pathname]);

  // Fetch search results (projects endpoint searches workflow_type, industries, tools, logged_by_name)
  const trimmed = query.trim();
  const { data } = useQuery({
    queryKey: ["globalSearch", trimmed],
    queryFn: async () => {
      const { data } = await api.get(`/v1/briefs/?search=${encodeURIComponent(trimmed)}`);
      return data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });

  const results = useMemo(() => {
    const items = data?.results || [];
    return items.slice(0, 8).map(cf => ({
      id: cf.id,
      title: cf.name || cf.workflow_type || "Untitled",
      sub: [cf.logged_by_name, cf.workflow_type && cf.name ? cf.workflow_type : null, cf.industries?.[0]]
        .filter(Boolean).join(" · "),
      tools: (cf.tools || []).slice(0, 3),
      status: cf.status,
    }));
  }, [data]);

  useEffect(() => { setFocusIdx(0); }, [results.length]);

  const selectResult = (idx) => {
    const r = results[idx];
    if (!r) return;
    navigate(`/projects/${r.id}`);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectResult(focusIdx);
    }
  };

  const showDropdown = open && trimmed.length >= 2;

  return (
    <div
      ref={rootRef}
      className="fp-no-print"
      style={{
        position: "sticky", top: 0, zIndex: 15,
        height: 54, display: "flex", alignItems: "center",
        padding: "0 32px", gap: 16,
        background: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      {/* Breadcrumb — left */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontFamily: F, minWidth: 0 }}>
        <Link
          to="/dashboard"
          style={{ color: theme.textMuted, textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Workspace
        </Link>
        <span style={{ color: theme.textFaint }}>/</span>
        <span style={{ color: theme.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {leaf}
        </span>
      </div>

      {/* Search — centered */}
      <div style={{ position: "relative", flex: "0 0 420px", maxWidth: 420, minWidth: 240 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 10px", borderRadius: 8,
          background: theme.surface, border: `1px solid ${theme.border}`,
          transition: "border-color 0.15s, box-shadow 0.15s",
          boxShadow: open ? `0 0 0 3px ${theme.blueLight}` : "none",
        }}>
          <SearchIcon size={13} color={theme.textMuted} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search workflows, tools, people…"
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, minWidth: 0,
              background: "transparent", border: "none", outline: "none",
              fontSize: 12.5, fontFamily: F, color: theme.text,
            }}
          />
          <span style={{
            fontFamily: MONO, fontSize: 10.5, color: theme.textMuted,
            background: theme.surfaceAlt, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
          }}>
            ⌘ K
          </span>
        </div>

        {/* Results dropdown */}
        {showDropdown && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
            background: theme.surfaceRaised || theme.surface,
            border: `1px solid ${theme.border}`, borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            maxHeight: 420, overflowY: "auto", zIndex: 30,
          }}>
            {results.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", fontSize: 12.5, color: theme.textMuted, fontFamily: F }}>
                No results for <strong style={{ color: theme.text }}>"{trimmed}"</strong>
              </div>
            ) : (
              <>
                <div style={{
                  padding: "8px 14px", fontSize: 10.5, fontWeight: 600, color: theme.textFaint,
                  fontFamily: F, textTransform: "uppercase", letterSpacing: "0.1em",
                  borderBottom: `1px solid ${theme.borderSubtle}`,
                }}>
                  Projects & people
                </div>
                {results.map((r, i) => (
                  <button
                    key={r.id}
                    onMouseEnter={() => setFocusIdx(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectResult(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%",
                      padding: "10px 14px", border: "none", cursor: "pointer",
                      background: i === focusIdx ? theme.surfaceAlt : "transparent",
                      textAlign: "left", transition: "background 0.1s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {r.title}
                      </div>
                      {r.sub && (
                        <div style={{
                          fontSize: 11.5, color: theme.textMuted, fontFamily: F, marginTop: 1,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {r.sub}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {r.tools.map(t => (
                        <span key={t} style={{
                          fontFamily: MONO, fontSize: 10, color: theme.textSec,
                          background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
                          borderRadius: 4, padding: "1px 6px",
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <span style={{
                      fontFamily: MONO, fontSize: 9.5, fontWeight: 600,
                      padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                      background: r.status === "closed" ? "#E8F1EB" : "#EEEBFB",
                      color: r.status === "closed" ? "#204A33" : "#3B2F9C",
                      textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>
                      {r.status === "closed" ? "Closed" : "Open"}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right spacer — balances breadcrumb so search stays centered */}
      <div style={{ flex: 1 }} />
    </div>
  );
}
