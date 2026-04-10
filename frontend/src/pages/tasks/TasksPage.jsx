import { useState } from "react";
import { Link } from "react-router-dom";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from "../../hooks/useTodos";
import { useProjects } from "../../hooks/useProjects";
import { useAdminUsers } from "../../hooks/useUsers";
import { formatDate } from "../../utils/transforms";

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

// ── TodoModal (add & edit) ───────────────────────────────────────────────────
function TodoModal({ initial, onClose, onSave, isSaving }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: projectsData } = useProjects({ page: 1 });
  const { data: members } = useAdminUsers();

  const projects = projectsData?.results || [];
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    case_file_id: initial?.case_file_id || "",
    case_file_name: initial?.case_file_name || "",
    layer_reference: initial?.layer_reference || "",
    assigned_to_id: initial?.assigned_to_id || "",
    assigned_to_name: initial?.assigned_to_name || "",
    priority: initial?.priority || "medium",
    status: initial?.status || "open",
    due_date: initial?.due_date || "",
  });
  const [error, setError] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleProjectChange = (e) => {
    const selected = projects.find((p) => p.id === e.target.value);
    set("case_file_id", e.target.value);
    set("case_file_name", selected?.name || selected?.workflow_type || "");
  };

  const handleAssigneeChange = (e) => {
    const selected = (members || []).find((m) => m.id === e.target.value);
    set("assigned_to_id", e.target.value);
    set("assigned_to_name", selected
      ? `${selected.first_name} ${selected.last_name}`.trim() || selected.email
      : "");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }
    onSave({ ...form, title: form.title.trim() });
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px",
    border: `1.5px solid ${theme.borderInput}`, borderRadius: 8,
    fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg,
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F,
    display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em",
  };
  const focusOn  = (e) => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; };
  const focusOff = (e) => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; };

  const SegmentGroup = ({ label, options, value, onChange }) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", borderRadius: 8, border: `1.5px solid ${theme.borderInput}`, overflow: "hidden" }}>
        {options.map(({ key, display }, i) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: F,
                background: active ? theme.blue : "transparent",
                color: active ? "#fff" : theme.textMuted,
                border: "none",
                borderLeft: i > 0 ? `1px solid ${theme.borderInput}` : "none",
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, height: "100vh", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: theme.surface, borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "22px 28px 18px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800, fontFamily: F, color: theme.text, letterSpacing: "-0.02em" }}>
              {initial ? "Edit Task" : "New Task"}
            </h2>
            <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>
              {initial ? "Update task details below" : "Fill in the details to create a new task"}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${theme.borderInput}`, background: "transparent", fontSize: 16, cursor: "pointer", color: theme.textMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {error && (
            <div style={{ marginBottom: 18, padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#DC2626", fontFamily: F }}>
              {error}
            </div>
          )}

          {/* ── Details section ────────────────────────────────────── */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Details
            </p>

            {/* Row 1: Priority + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <SegmentGroup
                label="Priority"
                value={form.priority}
                onChange={(v) => set("priority", v)}
                options={[
                  { key: "low",    display: "Low" },
                  { key: "medium", display: "Med" },
                  { key: "high",   display: "High" },
                ]}
              />
              <SegmentGroup
                label="Status"
                value={form.status}
                onChange={(v) => set("status", v)}
                options={[
                  { key: "open",        display: "Open" },
                  { key: "in_progress", display: "In Progress" },
                  { key: "done",        display: "Done" },
                ]}
              />
            </div>

            {/* Row 2: Client Project — full width */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Client Project</label>
              <select value={form.case_file_id} onChange={handleProjectChange}
                style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusOn} onBlur={focusOff}>
                <option value="">— No project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.workflow_type || "Untitled"}</option>
                ))}
              </select>
            </div>

            {/* Row 3: Layer Ref + Due Date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: isAdmin ? 16 : 0 }}>
              <div>
                <label style={labelStyle}>Layer Reference <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: theme.textFaint }}>(optional)</span></label>
                <select value={form.layer_reference} onChange={(e) => set("layer_reference", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusOn} onBlur={focusOff}>
                  <option value="">— No layer —</option>
                  <option value="audit">Audit Layer</option>
                  <option value="intake">Intake Layer</option>
                  <option value="build">Build Layer</option>
                  <option value="delta">Delta Layer</option>
                  <option value="reasoning">Reasoning Layer</option>
                  <option value="outcome">Outcome Layer</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", colorScheme: theme.bg === "#111827" ? "dark" : "light" }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>
            </div>

            {/* Row 4: Assignee — admin only, full width */}
            {isAdmin && (
              <div>
                <label style={labelStyle}>Assignee</label>
                <select value={form.assigned_to_id} onChange={handleAssigneeChange}
                  style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusOn} onBlur={focusOff}>
                  <option value="">— Unassigned —</option>
                  {(members || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {`${m.first_name} ${m.last_name}`.trim() || m.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Task info ─────────────────────────────────────────── */}
          <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: 20, marginBottom: 20 }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Task Info
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Title <span style={{ color: "#EF4444", textTransform: "none", letterSpacing: 0 }}>*</span></label>
              <input
                autoFocus
                type="text"
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => { set("title", e.target.value); setError(""); }}
                style={{ ...inputStyle, fontSize: 15, fontWeight: 600, padding: "11px 14px" }}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>

            <div>
              <label style={labelStyle}>Description <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: theme.textFaint }}>(optional)</span></label>
              <textarea
                placeholder="Add context, acceptance criteria, or notes…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${theme.borderInput}`, borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: F, color: theme.textMuted, cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving}
              style={{ padding: "10px 24px", background: theme.blue, border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: F, color: "#fff", cursor: isSaving ? "not-allowed" : "pointer", opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? "Saving…" : initial ? "Save Changes" : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
      <div style={{ paddingTop: 1 }}>
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
        <p style={{
          margin: "0 0 4px", fontSize: 14, fontWeight: 600,
          color: theme.text, fontFamily: F,
          textDecoration: isDone ? "line-through" : "none",
        }}>
          {todo.title}
        </p>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {todo.case_file_name && (
            <span style={{ fontSize: 12, color: theme.blue, fontFamily: F }}>
              ◎ {todo.case_file_name}
            </span>
          )}
          {todo.layer_reference && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8,
              background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
              color: theme.textMuted, fontFamily: F, letterSpacing: "0.04em",
            }}>
              {LAYER_LABELS[todo.layer_reference]} Layer
            </span>
          )}
          {todo.assigned_to_name && (
            <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>
              → {todo.assigned_to_name}
            </span>
          )}
          {todo.due_date && (
            <span style={{ fontSize: 12, color: isOverdue ? "#EF4444" : theme.textFaint, fontFamily: F, fontWeight: isOverdue ? 600 : 400 }}>
              {isOverdue ? "⚠ " : ""}{formatDate(todo.due_date)}
            </span>
          )}
          <Pill cfg={STATUS_CONFIG[todo.status] || STATUS_CONFIG.open} />
          <Pill cfg={PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium} />
        </div>

        {todo.description && (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: theme.textMuted, fontFamily: F, lineHeight: 1.5 }}>
            {todo.description}
          </p>
        )}
      </div>

      {/* Delete — stop propagation so it doesn't open the modal */}
      <div style={{ flexShrink: 0, paddingTop: 1 }}>
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
  const [filters, setFilters] = useState({ status: "open", priority: "all", search: "", case_file_name: null });
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

  const handleSave = async (form) => {
    if (editTarget) {
      await updateTodo.mutateAsync({ id: editTarget.id, ...form });
    } else {
      await createTodo.mutateAsync(form);
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
            flex: "1 1 220px", padding: "9px 13px",
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
              padding: "0 !important",
              "& fieldset": { borderColor: theme.borderInput, borderWidth: "1.5px" },
              "&:hover fieldset": { borderColor: theme.borderInput },
              "&.Mui-focused fieldset": { borderColor: theme.blue, borderWidth: "1.5px", boxShadow: `0 0 0 3px ${theme.blueLight}` },
            },
            "& .MuiInputBase-input": {
              padding: "9px 13px !important",
              color: theme.text,
              fontFamily: F,
              fontSize: 13,
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
          style={{ flex: "0 1 150px", padding: "9px 13px", border: `1.5px solid ${theme.borderInput}`, borderRadius: 8, fontSize: 13, fontFamily: F, color: theme.text, background: theme.inputBg, outline: "none", cursor: "pointer" }}>
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
