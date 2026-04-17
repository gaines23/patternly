import { useState, useRef, useEffect } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useTheme } from "../../hooks/useTheme";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "../../hooks/useTodos";
import { useProjects } from "../../hooks/useProjects";
import { formatDate } from "../../utils/transforms";
import TodoModal from "../../components/TodoModal";

const F = "'Plus Jakarta Sans', sans-serif";

const LAYER_LABELS = {
  audit:     "Audit",
  intake:    "Intake",
  build:     "Build",
  delta:     "Delta",
  reasoning: "Reasoning",
  outcome:   "Outcome",
};

const PRIORITY_CONFIG = {
  high:   { label: "High",   bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  medium: { label: "Med",    bg: "#FFFBEB", border: "#FDE68A", color: "#D97706" },
  low:    { label: "Low",    bg: "#EFF6FF", border: "#BFDBFE", color: "#2563EB" },
};

const STATUS_CONFIG = {
  open:        { label: "Open",        bg: "#EFF6FF", border: "#BFDBFE", color: "#1D4ED8" },
  in_progress: { label: "In Progress", bg: "#FFFBEB", border: "#FDE68A", color: "#B45309" },
  done:        { label: "Done",        bg: "#ECFDF5", border: "#6EE7B7", color: "#065F46" },
};

const autocompleteSx = (theme) => ({
  "& .MuiOutlinedInput-root": {
    fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg,
    borderRadius: "8px", padding: "0 9px 0 0 !important", height: "38px",
    "& fieldset": { borderColor: theme.borderInput, borderWidth: "1.5px" },
    "&:hover fieldset": { borderColor: theme.borderInput },
    "&.Mui-focused fieldset": { borderColor: theme.blue, borderWidth: "1.5px", boxShadow: `0 0 0 3px ${theme.blueLight}` },
  },
  "& .MuiInputBase-input": { padding: "0 13px !important", color: theme.text, fontFamily: F, fontSize: 13, height: "100%", boxSizing: "border-box" },
  "& .MuiAutocomplete-clearIndicator": { color: theme.textFaint },
  "& .MuiAutocomplete-popupIndicator": { color: theme.textFaint },
});

const paperSx = (theme) => ({
  background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: "8px", mt: "4px",
  "& .MuiAutocomplete-option": { fontSize: 13, fontFamily: F, color: theme.text },
  "& .MuiAutocomplete-option.Mui-focused": { background: theme.surfaceAlt },
  "& .MuiAutocomplete-noOptions": { fontSize: 13, fontFamily: F, color: theme.textMuted },
});

// ── Icons ───────────────────────────────────────────────────────────────────
function GridIcon({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/>
      <rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>
    </svg>
  );
}

function ListIcon({ size = 20, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 5h12M4 10h12M4 15h12"/><circle cx="4" cy="5" r="0.5" fill={color}/><circle cx="4" cy="10" r="0.5" fill={color}/><circle cx="4" cy="15" r="0.5" fill={color}/>
    </svg>
  );
}

function FilterIcon({ size = 16, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M4 8h8M6 12h4"/>
    </svg>
  );
}

// ── Pill badge ──────────────────────────────────────────────────────────────
function Pill({ cfg, style = {} }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
      whiteSpace: "nowrap", ...style,
    }}>
      {cfg.label}
    </span>
  );
}

// ── Task Card (grid view) ───────────────────────────────────────────────────
function TaskCard({ todo, onEdit, onToggleDone, theme }) {
  const isDone = todo.status === "done";
  const isOverdue = todo.due_date && !isDone && todo.due_date < new Date().toISOString().slice(0, 10);

  return (
    <div
      onClick={() => onEdit(todo)}
      style={{
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14,
        padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10,
        opacity: isDone ? 0.65 : 1, cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = theme.blueBorder; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Top: checkbox + title */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(todo); }}
          title={isDone ? "Mark open" : "Mark done"}
          style={{
            width: 20, height: 20, borderRadius: 5, cursor: "pointer", flexShrink: 0, marginTop: 2,
            border: `2px solid ${isDone ? "#10B981" : theme.borderInput}`,
            background: isDone ? "#10B981" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "#fff", transition: "all 0.15s",
          }}
        >
          {isDone ? "✓" : ""}
        </button>
        <span style={{
          fontSize: 15, fontWeight: 600, color: theme.text, fontFamily: F,
          textDecoration: isDone ? "line-through" : "none", lineHeight: 1.4,
        }}>
          {todo.title}
        </span>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Pill cfg={STATUS_CONFIG[todo.status] || STATUS_CONFIG.open} />
        <Pill cfg={PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium} />
        {todo.layer_reference && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, color: theme.textMuted, fontFamily: F }}>
            {LAYER_LABELS[todo.layer_reference]}
          </span>
        )}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
        {todo.case_file_name && (
          <span style={{ fontSize: 12, color: theme.blue, fontFamily: F, fontWeight: 500 }}>{todo.case_file_name}</span>
        )}
        {todo.assigned_to_name && (
          <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{todo.assigned_to_name}</span>
        )}
      </div>

      {/* Footer: due date */}
      {todo.due_date && (
        <div style={{ marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${theme.borderSubtle}` }}>
          <span style={{ fontSize: 12, fontWeight: isOverdue ? 600 : 400, fontFamily: F, color: isOverdue ? "#EF4444" : theme.textFaint }}>
            {isOverdue ? "Overdue · " : ""}{formatDate(todo.due_date)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Task Row (list view) ────────────────────────────────────────────────────
function TaskRow({ todo, onEdit, onDelete, onToggleDone, theme }) {
  const isDone = todo.status === "done";
  const isOverdue = todo.due_date && !isDone && todo.due_date < new Date().toISOString().slice(0, 10);

  return (
    <div
      onClick={() => onEdit(todo)}
      style={{
        display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, alignItems: "flex-start",
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10,
        padding: "14px 16px", marginBottom: 6, opacity: isDone ? 0.65 : 1, cursor: "pointer",
        transition: "border-color 0.15s, opacity 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = theme.blue}
      onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
    >
      <div style={{ paddingTop: 1, margin: "auto" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(todo); }}
          title={isDone ? "Mark open" : "Mark done"}
          style={{
            width: 20, height: 20, borderRadius: 5, cursor: "pointer",
            border: `2px solid ${isDone ? "#10B981" : theme.borderInput}`,
            background: isDone ? "#10B981" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "#fff", flexShrink: 0, transition: "all 0.15s",
          }}
        >
          {isDone ? "✓" : ""}
        </button>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F, textDecoration: isDone ? "line-through" : "none" }}>
          {todo.title}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {todo.case_file_name && <span style={{ fontSize: 12, color: theme.blue, fontFamily: F, fontWeight: 500 }}>{todo.case_file_name}</span>}
          {todo.layer_reference && (<>
            {todo.case_file_name && <span style={{ color: theme.textFaint, fontSize: 11 }}>·</span>}
            <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{LAYER_LABELS[todo.layer_reference]} Layer</span>
          </>)}
          {todo.due_date && (<>
            {(todo.case_file_name || todo.layer_reference) && <span style={{ color: theme.textFaint, fontSize: 11 }}>·</span>}
            <span style={{ fontSize: 12, fontWeight: isOverdue ? 600 : 400, fontFamily: F, color: isOverdue ? "#EF4444" : theme.textFaint }}>
              {isOverdue ? "⚠ " : ""}{formatDate(todo.due_date)}
            </span>
          </>)}
          {todo.assigned_to_name && (<>
            <span style={{ color: theme.textFaint, fontSize: 11 }}>·</span>
            <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{todo.assigned_to_name}</span>
          </>)}
          <Pill cfg={STATUS_CONFIG[todo.status] || STATUS_CONFIG.open} style={{ marginLeft: 2 }} />
          <Pill cfg={PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium} />
        </div>
      </div>
      <div style={{ flexShrink: 0, paddingTop: 1, margin: "auto" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(todo.id); }}
          style={{ padding: "4px 10px", background: "transparent", border: "1px solid #FECACA", borderRadius: 6, fontSize: 12, color: "#EF4444", fontFamily: F, cursor: "pointer" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Group renderer (shared between views) ───────────────────────────────────
function GroupedTasks({ grouped, groupOrder, groupLabels, view, theme, handlers }) {
  const today    = new Date().toISOString().slice(0, 10);
  const fmtDate  = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return groupOrder.filter(g => grouped[g]?.length > 0).map(g => {
    const flatOnly = g === "today" || g === "tomorrow" || g === "no_date" || g === "done";
    const dateSubGroups = flatOnly ? null : (() => {
      const byDate = grouped[g].reduce((acc, t) => { const key = t.due_date || ""; (acc[key] = acc[key] || []).push(t); return acc; }, {});
      return Object.entries(byDate).sort(([a], [b]) => g === "overdue" ? b.localeCompare(a) : a.localeCompare(b));
    })();

    const renderItems = (items) => view === "grid"
      ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {items.map(todo => <TaskCard key={todo.id} todo={todo} theme={theme} {...handlers} />)}
        </div>
      : items.map(todo => <TaskRow key={todo.id} todo={todo} theme={theme} {...handlers} />);

    return (
      <div key={g} style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: F,
            color: g === "overdue" ? "#EF4444" : g === "done" ? "#10B981" : theme.textMuted,
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            {groupLabels[g]}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: F, color: theme.textFaint,
            background: theme.surfaceAlt || theme.surface,
            border: `1px solid ${theme.border}`, borderRadius: 10, padding: "1px 7px",
          }}>
            {grouped[g].length}
          </span>
          <div style={{ flex: 1, height: 1, background: theme.border }} />
        </div>

        {flatOnly ? renderItems(grouped[g]) : (
          dateSubGroups.map(([date, dateTodos]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, paddingLeft: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: F, color: g === "overdue" ? "#EF4444" : theme.textFaint }}>
                  {fmtDate(date)}
                </span>
                <div style={{ flex: 1, height: 1, background: theme.border, opacity: 0.5 }} />
              </div>
              {renderItems(dateTodos)}
            </div>
          ))
        )}
      </div>
    );
  });
}

// ── TasksPage ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ status: "all", priority: "all", search: "", case_file_name: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [view, setView] = useState("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { todos: allTodos, isLoading, isError } = useTodos({});
  const { data: allProjectsData } = useProjects({});
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  // Client-side filtering
  const filteredTodos = allTodos.filter((t) => {
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.priority !== "all" && t.priority !== filters.priority) return false;
    if (filters.case_file_name && t.case_file_name !== filters.case_file_name) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) &&
          !(t.case_file_name || "").toLowerCase().includes(q) &&
          !(t.description || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Grouping
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const today    = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const getGroup = (t) => {
    if (t.status === "done") return "done";
    if (!t.due_date)         return "no_date";
    if (t.due_date < today)  return "overdue";
    if (t.due_date === today) return "today";
    if (t.due_date === tomorrow) return "tomorrow";
    if (t.due_date <= nextWeek) return "this_week";
    return "later";
  };

  const GROUP_ORDER  = ["overdue", "today", "tomorrow", "this_week", "later", "no_date", "done"];
  const GROUP_LABELS = { overdue: "Overdue", today: "Today", tomorrow: "Tomorrow", this_week: "This Week", later: "Later", no_date: "No Due Date", done: "Done" };

  const grouped = filteredTodos.reduce((acc, t) => { const g = getGroup(t); (acc[g] = acc[g] || []).push(t); return acc; }, {});
  Object.values(grouped).forEach(arr => arr.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)));

  const apiProjectNames = (allProjectsData?.results || []).map(p => p.name || p.workflow_type || "Untitled");
  const todoProjectNames = allTodos.map(t => t.case_file_name).filter(Boolean);
  const projectOptions = [...new Set([...apiProjectNames, ...todoProjectNames])].sort();

  const activeFilterCount = [
    filters.status !== "all" ? filters.status : null,
    filters.priority !== "all" ? filters.priority : null,
    filters.case_file_name,
  ].filter(Boolean).length;

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters({ status: "all", priority: "all", search: filters.search, case_file_name: null });

  const buildPayload = (form) => ({
    title: form.title, description: form.description || "", status: form.status,
    priority: form.priority, case_file: form.case_file || null,
    layer_reference: form.layer_reference || "", assigned_to: form.assigned_to || null,
    due_date: form.due_date || null,
  });

  const handleSave = async (form) => {
    const payload = buildPayload(form);
    if (editTarget) { await updateTodo.mutateAsync({ id: editTarget.id, ...payload }); }
    else { await createTodo.mutateAsync(payload); }
    setModalOpen(false); setEditTarget(null);
  };
  const handleEdit = (todo) => { setEditTarget(todo); setModalOpen(true); };
  const handleDelete = async (id) => { await deleteTodo.mutateAsync(id); };
  const handleToggleDone = async (todo) => { await updateTodo.mutateAsync({ id: todo.id, status: todo.status === "done" ? "open" : "done" }); };

  const handlers = { onEdit: handleEdit, onDelete: handleDelete, onToggleDone: handleToggleDone };

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 1100 }}>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={theme.textFaint} strokeWidth="1.5" strokeLinecap="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>
          </svg>
          <input
            type="text" placeholder="Search tasks..."
            value={filters.search}
            onChange={e => setFilter("search", e.target.value)}
            style={{
              width: "100%", padding: "11px 14px 11px 38px", border: `1.5px solid ${theme.borderInput}`,
              borderRadius: 10, fontSize: 14, fontFamily: F, color: theme.text, background: theme.inputBg,
              outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={e => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; }}
            onBlur={e => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Filter button + dropdown */}
        <div ref={filterRef} style={{ position: "relative" }}>
          <button onClick={() => setFilterOpen(o => !o)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            background: activeFilterCount > 0 ? theme.blueLight : theme.surface,
            border: `1.5px solid ${activeFilterCount > 0 ? theme.blueBorder : theme.borderInput}`, borderRadius: 10,
            fontSize: 13, fontWeight: 600, fontFamily: F, color: theme.text, cursor: "pointer",
            transition: "border-color 0.15s",
          }}>
            <FilterIcon size={16} color={activeFilterCount > 0 ? theme.blue : theme.textMuted} />
            Filter
            {activeFilterCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: theme.blue, borderRadius: "50%", width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", marginLeft: 2 }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30, width: 320,
              background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "16px 18px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>Filters</span>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} style={{ fontSize: 11, fontWeight: 600, color: theme.blue, background: "none", border: "none", cursor: "pointer", fontFamily: F }}>
                    Clear all
                  </button>
                )}
              </div>

              {/* Status */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Status</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ key: "all", label: "All" }, { key: "open", label: "Open" }, { key: "in_progress", label: "In Progress" }, { key: "done", label: "Done" }].map(s => (
                    <button key={s.key} onClick={() => setFilter("status", s.key)}
                      style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: F, cursor: "pointer",
                        border: filters.status === s.key ? `1.5px solid ${theme.blue}` : `1.5px solid ${theme.borderInput}`,
                        background: filters.status === s.key ? theme.blueLight : theme.inputBg,
                        color: filters.status === s.key ? theme.blue : theme.textMuted,
                        transition: "all 0.12s",
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Priority</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ key: "all", label: "All" }, { key: "high", label: "High" }, { key: "medium", label: "Med" }, { key: "low", label: "Low" }].map(p => (
                    <button key={p.key} onClick={() => setFilter("priority", p.key)}
                      style={{
                        flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: F, cursor: "pointer",
                        border: filters.priority === p.key ? `1.5px solid ${theme.blue}` : `1.5px solid ${theme.borderInput}`,
                        background: filters.priority === p.key ? theme.blueLight : theme.inputBg,
                        color: filters.priority === p.key ? theme.blue : theme.textMuted,
                        transition: "all 0.12s",
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Project</label>
                <Autocomplete
                  options={projectOptions}
                  value={filters.case_file_name}
                  onChange={(_, val) => setFilter("case_file_name", val)}
                  clearOnEscape blurOnSelect size="small"
                  sx={autocompleteSx(theme)}
                  slotProps={{ paper: { sx: paperSx(theme) } }}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="All projects" variant="outlined" size="small"
                      sx={{ "& .MuiInputBase-input::placeholder": { color: theme.textMuted, opacity: 1, fontFamily: F, fontSize: 13 } }} />
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* New Task button */}
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
            background: theme.blue, border: "none", borderRadius: 10,
            color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer",
          }}>
          + New Task
        </button>

        {/* View toggle */}
        <div style={{ display: "flex", border: `1.5px solid ${theme.borderInput}`, borderRadius: 10, overflow: "hidden" }}>
          <button onClick={() => setView("grid")} style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
            background: view === "grid" ? theme.text : theme.surface, border: "none", cursor: "pointer", transition: "background 0.15s",
          }}>
            <GridIcon size={18} color={view === "grid" ? theme.surface : theme.textFaint} />
          </button>
          <button onClick={() => setView("list")} style={{
            display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40,
            background: view === "list" ? theme.text : theme.surface, border: "none", cursor: "pointer",
            borderLeft: `1px solid ${theme.borderInput}`, transition: "background 0.15s",
          }}>
            <ListIcon size={18} color={view === "list" ? theme.surface : theme.textFaint} />
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {filters.status !== "all" && (
            <span onClick={() => setFilter("status", "all")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, fontFamily: F, color: theme.blue, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
              Status: {filters.status.replace("_", " ")} <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>×</span>
            </span>
          )}
          {filters.priority !== "all" && (
            <span onClick={() => setFilter("priority", "all")} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, fontFamily: F, color: theme.blue, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
              Priority: {filters.priority} <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>×</span>
            </span>
          )}
          {filters.case_file_name && (
            <span onClick={() => setFilter("case_file_name", null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, fontFamily: F, color: theme.blue, background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>
              {filters.case_file_name} <span style={{ fontWeight: 700, fontSize: 14, lineHeight: 1 }}>×</span>
            </span>
          )}
          <button onClick={clearFilters} style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, background: "none", border: "none", cursor: "pointer", fontFamily: F, padding: "4px 6px" }}>
            Clear all
          </button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading tasks…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load tasks. Please refresh.</div>
      ) : filteredTodos.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 16, color: theme.textMuted, fontFamily: F, marginBottom: 12 }}>
            {filters.search || filters.case_file_name || filters.status !== "all" || filters.priority !== "all"
              ? "No tasks match your filters."
              : "No tasks yet. Add your first one."}
          </p>
          {!filters.search && filters.status === "all" && (
            <button onClick={() => { setEditTarget(null); setModalOpen(true); }}
              style={{ padding: "9px 20px", background: theme.blue, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
              + New Task
            </button>
          )}
        </div>
      ) : (
        <GroupedTasks grouped={grouped} groupOrder={GROUP_ORDER} groupLabels={GROUP_LABELS}
          view={view} theme={theme} handlers={handlers} />
      )}

      {modalOpen && (
        <TodoModal
          initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSave={handleSave}
          isSaving={createTodo.isPending || updateTodo.isPending}
        />
      )}
    </div>
  );
}
