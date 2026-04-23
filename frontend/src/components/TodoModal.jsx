import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../hooks/useAuth";
import { useProjects } from "../hooks/useProjects";
import { useAdminUsers } from "../hooks/useUsers";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Shared modal for creating and editing todos.
 *
 * Props:
 *   initial  — todo object to pre-populate (null = new task)
 *   onClose  — called when the modal should close
 *   onSave   — called with the form data when submitted
 *   isSaving — disables the submit button while a mutation is pending
 */
export default function TodoModal({ initial, onClose, onSave, onDelete, isSaving, isDeleting }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { data: projectsData } = useProjects({ page: 1 });
  const { data: members } = useAdminUsers();

  const projects = projectsData?.results || [];
  const isAdmin = user?.role === "admin";

  const [form, setForm] = useState({
    title:           initial?.title           || "",
    description:     initial?.description     || "",
    case_file:       initial?.case_file       || "",
    case_file_name:  initial?.case_file_name  || "",
    layer_reference: initial?.layer_reference || "",
    assigned_to:     initial?.assigned_to     || "",
    assigned_to_name:initial?.assigned_to_name|| "",
    priority:        initial?.priority        || "medium",
    status:          initial?.status          || "open",
    due_date:        initial?.due_date        || "",
  });
  const [error, setError] = useState("");

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleProjectChange = (e) => {
    const selected = projects.find((p) => p.id === e.target.value);
    set("case_file", e.target.value);
    set("case_file_name", selected?.name || selected?.workflow_type || "");
  };

  const handleAssigneeChange = (e) => {
    const selected = (members || []).find((m) => m.id === e.target.value);
    set("assigned_to", e.target.value);
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
            <button key={key} type="button" onClick={() => onChange(key)}
              style={{
                flex: 1, padding: "8px 4px",
                fontSize: 12, fontWeight: active ? 700 : 500, fontFamily: F,
                background: active ? theme.blue : "transparent",
                color: active ? "#fff" : theme.textMuted,
                border: "none",
                borderLeft: i > 0 ? `1px solid ${theme.borderInput}` : "none",
                cursor: "pointer", transition: "all 0.12s",
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
    <div style={{ position: "fixed", inset: 0, height: "100vh", background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div style={{ background: theme.surfaceRaised, borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>

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

          {/* ── Details ── */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>Details</p>

            {/* Priority + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <SegmentGroup label="Priority" value={form.priority} onChange={(v) => set("priority", v)}
                options={[{ key: "low", display: "Low" }, { key: "medium", display: "Med" }, { key: "high", display: "High" }]}
              />
              <SegmentGroup label="Status" value={form.status} onChange={(v) => set("status", v)}
                options={[{ key: "open", display: "Open" }, { key: "in_progress", display: "In Progress" }, { key: "done", display: "Done" }]}
              />
            </div>

            {/* Client Project */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Client Project</label>
              <select value={form.case_file} onChange={handleProjectChange}
                style={{ ...inputStyle, cursor: "pointer" }} onFocus={focusOn} onBlur={focusOff}>
                <option value="">— No project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.workflow_type || "Untitled"}</option>
                ))}
              </select>
            </div>

            {/* Layer Ref + Due Date */}
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
                <input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer", colorScheme: theme.bg === "#111827" ? "dark" : "light" }}
                  onFocus={focusOn} onBlur={focusOff}
                />
              </div>
            </div>

            {/* Assignee — admin only */}
            {isAdmin && (
              <div>
                <label style={labelStyle}>Assignee</label>
                <select value={form.assigned_to} onChange={handleAssigneeChange}
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

          {/* ── Task Info ── */}
          <div style={{ borderTop: `1px solid ${theme.borderSubtle}`, paddingTop: 20, marginBottom: 20 }}>
            <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>Task Info</p>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Title <span style={{ color: "#EF4444", textTransform: "none", letterSpacing: 0 }}>*</span></label>
              <input autoFocus type="text" placeholder="What needs to be done?" value={form.title}
                onChange={(e) => { set("title", e.target.value); setError(""); }}
                style={{ ...inputStyle, fontSize: 15, fontWeight: 600, padding: "11px 14px" }}
                onFocus={focusOn} onBlur={focusOff}
              />
            </div>

            <div>
              <label style={labelStyle}>Description <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: theme.textFaint }}>(optional)</span></label>
              <textarea placeholder="Add context, acceptance criteria, or notes…" value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={focusOn} onBlur={focusOff}
              />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 4 }}>
            {initial && onDelete && (
              <button type="button" onClick={onDelete} disabled={isDeleting}
                style={{ padding: "10px 18px", background: "transparent", border: "1px solid #FECACA", borderRadius: 9, fontSize: 13, fontWeight: 600, fontFamily: F, color: "#EF4444", cursor: isDeleting ? "not-allowed" : "pointer", opacity: isDeleting ? 0.7 : 1 }}>
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <div style={{ flex: 1 }} />
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
