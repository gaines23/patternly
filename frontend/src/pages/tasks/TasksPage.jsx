import { useState } from "react";
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

// ── Pill badge ───────────────────────────────────────────────────────────────
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

// ── TaskRow ──────────────────────────────────────────────────────────────────
function TaskRow({ todo, onEdit, onDelete, onToggleDone, theme }) {
  const isDone = todo.status === "done";
  const isOverdue = todo.due_date && !isDone && todo.due_date < new Date().toISOString().slice(0, 10);

  return (
    <div
      onClick={() => onEdit(todo)}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr auto",
        gap: 12,
        alignItems: "flex-start",
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 6,
        opacity: isDone ? 0.65 : 1,
        cursor: "pointer",
        transition: "border-color 0.15s, opacity 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.blue; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
    >
      {/* Checkbox — stop propagation so clicking it doesn't open the modal */}
      <div style={{ paddingTop: 1, margin: "auto" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleDone(todo); }}
          title={isDone ? "Mark open" : "Mark done"}
          style={{
            width: 20, height: 20, borderRadius: 5, cursor: "pointer",
            border: `2px solid ${isDone ? "#10B981" : theme.borderInput}`,
            background: isDone ? "#10B981" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, color: "#fff", flexShrink: 0,
            transition: "all 0.15s",
          }}
        >
          {isDone ? "✓" : ""}
        </button>
      </div>

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        {/* Title */}
        <p style={{
          margin: "0 0 5px", fontSize: 14, fontWeight: 600,
          color: theme.text, fontFamily: F,
          textDecoration: isDone ? "line-through" : "none",
        }}>
          {todo.title}
        </p>

        {/* Meta row — single line, dot-separated */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {todo.case_file_name && (
            <span style={{ fontSize: 12, color: theme.blue, fontFamily: F, fontWeight: 500 }}>
              {todo.case_file_name}
            </span>
          )}
          {todo.layer_reference && (
            <>
              {todo.case_file_name && <span style={{ color: theme.textFaint, fontSize: 11 }}>·</span>}
              <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
                {LAYER_LABELS[todo.layer_reference]} Layer
              </span>
            </>
          )}
          {todo.due_date && (
            <>
              {(todo.case_file_name || todo.layer_reference) && <span style={{ color: theme.textFaint, fontSize: 11 }}>·</span>}
              <span style={{ fontSize: 12, fontWeight: isOverdue ? 600 : 400, fontFamily: F, color: isOverdue ? "#EF4444" : theme.textFaint }}>
                {isOverdue ? "⚠ " : ""}{formatDate(todo.due_date)}
              </span>
            </>
          )}
          {todo.assigned_to_name && (
            <>
              <span style={{ color: theme.textFaint, fontSize: 11 }}>·</span>
              <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{todo.assigned_to_name}</span>
            </>
          )}
          <Pill cfg={STATUS_CONFIG[todo.status] || STATUS_CONFIG.open} style={{ marginLeft: 2 }} />
          <Pill cfg={PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium} />
        </div>
      </div>

      {/* Delete — stop propagation so it doesn't open the modal */}
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

// ── TasksPage ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { theme } = useTheme();
  const [filters, setFilters] = useState({ status: "all", priority: "all", search: "", case_file_name: null });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Fetch all todos unfiltered — used for tab counts and client-side filtering.
  const { todos: allTodos, isLoading, isError } = useTodos({});
  // Fetch all projects for the filter dropdown (shows projects even with no tasks yet).
  const { data: allProjectsData } = useProjects({});
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  // Client-side filtering
  const todos = allTodos.filter((t) => {
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
  }).sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (b.status === "done" && a.status !== "done") return -1;
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  // Union of API projects + any todo project names not already in the API list.
  const apiProjectNames = (allProjectsData?.results || []).map((p) => p.name || p.workflow_type || "Untitled");
  const todoProjectNames = allTodos.map((t) => t.case_file_name).filter(Boolean);
  const projectOptions = [...new Set([...apiProjectNames, ...todoProjectNames])].sort();

  const openCounts = {
    all:         allTodos.length,
    open:        allTodos.filter((t) => t.status === "open").length,
    in_progress: allTodos.filter((t) => t.status === "in_progress").length,
    done:        allTodos.filter((t) => t.status === "done").length,
  };

  const buildPayload = (form) => ({
    title:           form.title,
    description:     form.description || "",
    status:          form.status,
    priority:        form.priority,
    case_file:       form.case_file       || null,
    layer_reference: form.layer_reference || null,
    assigned_to:     form.assigned_to     || null,
    due_date:        form.due_date        || null,
  });

  const handleSave = async (form) => {
    const payload = buildPayload(form);
    if (editTarget) {
      await updateTodo.mutateAsync({ id: editTarget.id, ...payload });
    } else {
      await createTodo.mutateAsync(payload);
    }
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleEdit = (todo) => {
    setEditTarget(todo);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteTodo.mutateAsync(id);
  };

  const handleToggleDone = async (todo) => {
    await updateTodo.mutateAsync({
      id: todo.id,
      status: todo.status === "done" ? "open" : "done",
    });
  };

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const STATUS_TABS = [
    { key: "all",        label: "All" },
    { key: "open",       label: "Open" },
    { key: "in_progress",label: "In Progress" },
    { key: "done",       label: "Done" },
  ];

  const tabBase = { padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", border: "none", transition: "all 0.15s" };

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 900 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 26, fontFamily: "'Fraunces', serif", color: theme.text }}>Tasks</h1>
          <p style={{ margin: 0, fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            {todos.length} task{todos.length !== 1 ? "s" : ""}
            {filters.status !== "all" ? ` · ${filters.status.replace("_", " ")}` : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setModalOpen(true); }}
          style={{ padding: "10px 20px", background: theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
          + New Task
        </button>
      </div>

      {/* Status tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_TABS.map(({ key, label }) => {
          const active = filters.status === key;
          return (
            <button key={key} onClick={() => setFilter("status", key)}
              style={{
                ...tabBase,
                background: active ? theme.blue : theme.surface,
                color: active ? "#fff" : theme.textMuted,
                border: `1px solid ${active ? theme.blue : theme.borderInput}`,
              }}>
              {label}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>
                {openCounts[key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          style={{
            flex: "1 1 220px", padding: "9px 13px", height: 40, boxSizing: "border-box",
            border: `1.5px solid ${theme.borderInput}`, borderRadius: 8,
            fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg, outline: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; }}
          onBlur={(e) => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; }}
        />

        {/* Project filter — MUI Autocomplete */}
        <Autocomplete
          options={projectOptions}
          value={filters.case_file_name}
          onChange={(_, val) => setFilter("case_file_name", val)}
          clearOnEscape
          blurOnSelect
          sx={{
            flex: "0 1 220px",
            "& .MuiOutlinedInput-root": {
              fontSize: 13,
              fontFamily: F,
              color: theme.text,
              background: theme.inputBg,
              borderRadius: "8px",
              padding: "0 9px 0 0 !important",
              height: "40px",
              "& fieldset": { borderColor: theme.borderInput, borderWidth: "1.5px" },
              "&:hover fieldset": { borderColor: theme.borderInput },
              "&.Mui-focused fieldset": { borderColor: theme.blue, borderWidth: "1.5px", boxShadow: `0 0 0 3px ${theme.blueLight}` },
            },
            "& .MuiInputBase-input": {
              padding: "0 13px !important",
              color: theme.text,
              fontFamily: F,
              fontSize: 13,
              height: "100%",
              boxSizing: "border-box",
            },
          }}
          slotProps={{
            paper: {
              sx: {
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                borderRadius: "8px",
                mt: "4px",
                "& .MuiAutocomplete-option": { fontSize: 13, fontFamily: F, color: theme.text },
                "& .MuiAutocomplete-option.Mui-focused": { background: theme.surfaceAlt },
                "& .MuiAutocomplete-noOptions": { fontSize: 13, fontFamily: F, color: theme.textMuted },
              },
            },
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="All Projects"
              variant="outlined"
              size="small"
              sx={{
                "& .MuiInputBase-input::placeholder": { color: theme.textMuted, opacity: 1, fontFamily: F, fontSize: 13 },
              }}
            />
          )}
        />

        {/* Priority filter */}
        <select
          value={filters.priority}
          onChange={(e) => setFilter("priority", e.target.value)}
          style={{ flex: "0 1 150px", padding: "9px 13px", height: 40, boxSizing: "border-box", border: `1.5px solid ${theme.borderInput}`, borderRadius: 8, fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg, outline: "none", cursor: "pointer" }}>
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>Loading tasks…</div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: "center", color: "#EF4444", fontFamily: F }}>Failed to load tasks. Please refresh.</div>
      ) : todos.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14 }}>
          <p style={{ fontSize: 16, color: theme.textMuted, fontFamily: F, marginBottom: 12 }}>
            {filters.search || filters.case_file_name || filters.status !== "all" || filters.priority !== "all"
              ? "No tasks match your filters."
              : "No tasks yet. Add your first one."}
          </p>
          {!filters.search && filters.status === "all" && (
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              style={{ padding: "9px 20px", background: theme.blue, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: "pointer" }}>
              + New Task
            </button>
          )}
        </div>
      ) : (
        <div>
          {todos.map((todo) => (
            <TaskRow
              key={todo.id}
              todo={todo}
              theme={theme}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleDone={handleToggleDone}
            />
          ))}
        </div>
      )}

      {/* Modal */}
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
