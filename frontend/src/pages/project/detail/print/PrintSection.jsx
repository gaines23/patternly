import { PF } from "../constants";

/**
 * Print-only section header. Always open (no collapse).
 * Intentionally hardcodes light-mode colors — print is always light.
 *
 * Props:
 *   title    — section heading
 *   subtitle — optional muted sub-heading
 *   color    — accent color for the header bar
 */
export default function PrintSection({ title, subtitle, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
        background: `${color}12`, borderRadius: "10px 10px 0 0",
        border: `1px solid ${color}40`, borderBottom: `1.5px solid ${color}50`,
      }}>
        <span style={{ width: 20, height: 20, background: "#059669", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>✓</span>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color, fontFamily: PF }}>{title}</p>
          {subtitle && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#6B7280", fontFamily: PF }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ background: "#fff", border: `1px solid ${color}40`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "18px 14px" }}>
        {children}
      </div>
    </div>
  );
}
