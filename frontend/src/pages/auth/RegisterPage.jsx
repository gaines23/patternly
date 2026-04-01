import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.values(data).flat().join(" ");
        setError(msgs);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const inputStyle = {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid #E5E7EB",
    borderRadius: 10,
    fontSize: 14,
    fontFamily: F,
    color: "#111827",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };
  const focusStyle = (e) => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = "0 0 0 3px #EFF6FF"; };
  const blurStyle = (e) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; };

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#111827", fontFamily: F, letterSpacing: "-0.04em" }}>flow</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: BLUE, fontFamily: F, letterSpacing: "-0.04em" }}>path</span>
          </Link>
        </div>

        <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 14, padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontFamily: "'Fraunces', serif", color: "#111827" }}>Create account</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6B7280", fontFamily: F }}>
            Start logging workflow builds and training the system.
          </p>

          {error && (
            <div style={{ padding: "11px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, marginBottom: 18, fontSize: 13, color: "#DC2626", fontFamily: F }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: F, marginBottom: 5 }}>First name</label>
                <input type="text" value={form.first_name} onChange={set("first_name")} placeholder="Alex" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: F, marginBottom: 5 }}>Last name</label>
                <input type="text" value={form.last_name} onChange={set("last_name")} placeholder="Johnson" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: F, marginBottom: 5 }}>Email</label>
              <input type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: F, marginBottom: 5 }}>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="Min 8 characters" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: 12, background: loading ? "#93C5FD" : BLUE, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: F, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#6B7280", fontFamily: F }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: BLUE, fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
