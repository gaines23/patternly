import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { useMyTeams, useSwitchTeam } from "../../hooks/useUsers";

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
  [/^\/billing$/,              "Billing"],
  [/^\/ingest$/,               "Ingest"],
  [/^\/patterns$/,             "Patterns"],
  [/^\/generate$/,             "Generate brief"],
  [/^\/library$/,              "Library"],
  [/^\/library\/new$/,         "New library item"],
  [/^\/library\/[^/]+$/,       "Library item"],
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

  // Fetch search results — briefs (name, workflow_type, industries, tools,
  // logged_by_name, and related todo text) plus todos (title, description,
  // case_file_name) so searching a project name surfaces both the project
  // and the todos attached to it.
  const trimmed = query.trim();
  const { data: briefData } = useQuery({
    queryKey: ["globalSearch", "briefs", trimmed],
    queryFn: async () => {
      const { data } = await api.get(`/v1/briefs/?search=${encodeURIComponent(trimmed)}`);
      return data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });

  const { data: todoData } = useQuery({
    queryKey: ["globalSearch", "todos", trimmed],
    queryFn: async () => {
      const { data } = await api.get(`/v1/todos/?search=${encodeURIComponent(trimmed)}`);
      return data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });

  const { data: libraryData } = useQuery({
    queryKey: ["globalSearch", "library", trimmed],
    queryFn: async () => {
      const { data } = await api.get(`/v1/library/items/?search=${encodeURIComponent(trimmed)}`);
      return data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 30_000,
  });

  const projectResults = useMemo(() => {
    const items = briefData?.results || [];
    return items.slice(0, 6).map(cf => ({
      kind: "project",
      id: cf.id,
      to: `/projects/${cf.id}`,
      title: cf.name || cf.workflow_type || "Untitled",
      sub: [cf.logged_by_name, cf.workflow_type && cf.name ? cf.workflow_type : null, cf.industries?.[0]]
        .filter(Boolean).join(" · "),
      tools: (cf.tools || []).slice(0, 3),
      status: cf.status,
    }));
  }, [briefData]);

  const todoResults = useMemo(() => {
    const items = (todoData?.results || todoData || []);
    return items.slice(0, 6).map(t => ({
      kind: "todo",
      id: t.id,
      to: t.case_file ? `/projects/${t.case_file}` : "/tasks",
      title: t.title,
      sub: [t.case_file_name || null, t.assigned_to_name || null, t.due_date ? `Due ${t.due_date}` : null]
        .filter(Boolean).join(" · "),
      status: t.status,
      priority: t.priority,
    }));
  }, [todoData]);

  const libraryResults = useMemo(() => {
    const items = (libraryData?.results || libraryData || []);
    return items.slice(0, 6).map(it => ({
      kind: "library",
      id: it.id,
      to: `/library/${it.id}`,
      title: it.name,
      sub: [
        it.kind ? it.kind.replace(/_/g, " ") : null,
        it.platform?.name || null,
        it.source_case_file_name ? `from ${it.source_case_file_name}` : null,
      ].filter(Boolean).join(" · "),
      kindLabel: it.kind,
    }));
  }, [libraryData]);

  // Flat list drives keyboard focus across all sections.
  const results = useMemo(
    () => [...projectResults, ...todoResults, ...libraryResults],
    [projectResults, todoResults, libraryResults],
  );

  useEffect(() => { setFocusIdx(0); }, [results.length]);

  const selectResult = (idx) => {
    const r = results[idx];
    if (!r) return;
    navigate(r.to);
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
                {projectResults.length > 0 && (
                  <div style={{
                    padding: "8px 14px", fontSize: 10.5, fontWeight: 600, color: theme.textFaint,
                    fontFamily: F, textTransform: "uppercase", letterSpacing: "0.1em",
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}>
                    Projects
                  </div>
                )}
                {projectResults.map((r, i) => {
                  const idx = i;
                  return (
                    <button
                      key={`p-${r.id}`}
                      onMouseEnter={() => setFocusIdx(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectResult(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%",
                        padding: "10px 14px", border: "none", cursor: "pointer",
                        background: idx === focusIdx ? theme.surfaceAlt : "transparent",
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
                  );
                })}

                {todoResults.length > 0 && (
                  <div style={{
                    padding: "8px 14px", fontSize: 10.5, fontWeight: 600, color: theme.textFaint,
                    fontFamily: F, textTransform: "uppercase", letterSpacing: "0.1em",
                    borderTop: projectResults.length > 0 ? `1px solid ${theme.borderSubtle}` : "none",
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}>
                    Tasks
                  </div>
                )}
                {todoResults.map((r, i) => {
                  const idx = projectResults.length + i;
                  return (
                    <button
                      key={`t-${r.id}`}
                      onMouseEnter={() => setFocusIdx(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectResult(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%",
                        padding: "10px 14px", border: "none", cursor: "pointer",
                        background: idx === focusIdx ? theme.surfaceAlt : "transparent",
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
                      <span style={{
                        fontFamily: MONO, fontSize: 9.5, fontWeight: 600,
                        padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                        background: r.status === "done" ? "#E8F1EB" : "#EEEBFB",
                        color: r.status === "done" ? "#204A33" : "#3B2F9C",
                        textTransform: "uppercase", letterSpacing: "0.1em",
                      }}>
                        {r.status === "done" ? "Done" : r.status === "in_progress" ? "In Progress" : "Open"}
                      </span>
                    </button>
                  );
                })}

                {libraryResults.length > 0 && (
                  <div style={{
                    padding: "8px 14px", fontSize: 10.5, fontWeight: 600, color: theme.textFaint,
                    fontFamily: F, textTransform: "uppercase", letterSpacing: "0.1em",
                    borderTop: (projectResults.length + todoResults.length) > 0 ? `1px solid ${theme.borderSubtle}` : "none",
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}>
                    Library
                  </div>
                )}
                {libraryResults.map((r, i) => {
                  const idx = projectResults.length + todoResults.length + i;
                  return (
                    <button
                      key={`l-${r.id}`}
                      onMouseEnter={() => setFocusIdx(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectResult(idx)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, width: "100%",
                        padding: "10px 14px", border: "none", cursor: "pointer",
                        background: idx === focusIdx ? theme.surfaceAlt : "transparent",
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
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right side — team switcher */}
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        <TeamSwitcher theme={theme} />
      </div>
    </div>
  );
}


function TeamSwitcher({ theme }) {
  const { user, refreshUser } = useAuth();
  const { data: memberships } = useMyTeams();
  const switchTeam = useSwitchTeam();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const teams = memberships?.results || memberships || [];
  const activeTeamId = user?.active_team?.id;
  const activeTeam = user?.active_team;

  // If the user only belongs to one team, no point showing a dropdown — just
  // render the team name as a static label.
  if (!user) return null;
  if (teams.length <= 1) {
    return activeTeam ? (
      <span style={{ fontSize: 12.5, fontFamily: F, color: theme.textMuted }}>
        {activeTeam.name}
      </span>
    ) : null;
  }

  const handleSwitch = async (teamId) => {
    if (teamId === activeTeamId) {
      setOpen(false);
      return;
    }
    try {
      await switchTeam.mutateAsync(teamId);
      await refreshUser();
    } finally {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={switchTeam.isPending}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 10px", borderRadius: 8,
          background: theme.surface, border: `1px solid ${theme.border}`,
          fontSize: 12.5, fontFamily: F, color: theme.text,
          cursor: switchTeam.isPending ? "wait" : "pointer",
          maxWidth: 220,
        }}
        title="Switch team"
      >
        <span style={{
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
        }}>
          {activeTeam?.name || "Select team"}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={theme.textMuted} strokeWidth="1.5">
          <path d="M2 3.5L5 6.5L8 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: theme.surfaceRaised || theme.surface,
          border: `1px solid ${theme.border}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          minWidth: 220, zIndex: 30, overflow: "hidden",
        }}>
          <div style={{
            padding: "8px 14px", fontSize: 10.5, fontWeight: 600, color: theme.textFaint,
            fontFamily: F, textTransform: "uppercase", letterSpacing: "0.1em",
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}>
            Switch team
          </div>
          {teams.map((m) => {
            const isActive = m.team.id === activeTeamId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSwitch(m.team.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, width: "100%", padding: "10px 14px",
                  border: "none", cursor: "pointer", textAlign: "left",
                  background: isActive ? theme.surfaceAlt : "transparent",
                  fontFamily: F,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: theme.text,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {m.team.name}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                    {m.role}
                  </div>
                </div>
                {isActive && (
                  <span style={{
                    fontFamily: MONO, fontSize: 9.5, fontWeight: 600,
                    padding: "2px 6px", borderRadius: 4,
                    background: "#E8F1EB", color: "#204A33",
                    textTransform: "uppercase", letterSpacing: "0.1em",
                  }}>
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
