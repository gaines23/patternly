import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

function FlowpathMark() {
  return (
    <svg width="44" height="44" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill={BLUE} />
      <circle cx="9" cy="20" r="4.5" fill="white" />
      <circle cx="18" cy="13" r="3" fill="white" fillOpacity="0.55" />
      <circle cx="27" cy="20" r="4.5" fill="white" />
      <circle cx="27" cy="20" r="1.8" fill={BLUE} />
      <path d="M13 17.5 Q18 9 23 17.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <FlowpathMark />
            <div>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#111827", fontFamily: F, letterSpacing: "-0.04em" }}>flow</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: BLUE, fontFamily: F, letterSpacing: "-0.04em" }}>path</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", fontFamily: F }}>Workflow Intelligence</p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          border: "1px solid #F0F0F0",
          borderRadius: 14,
          padding: "32px 28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontFamily: "'Fraunces', serif", color: "#111827" }}>
            Sign in
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "#6B7280", fontFamily: F }}>
            Log in to access the case file builder.
          </p>

          {error && (
            <div style={{
              padding: "11px 14px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              marginBottom: 18,
              fontSize: 13,
              color: "#DC2626",
              fontFamily: F,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: F, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = "0 0 0 3px #EFF6FF"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#111827", fontFamily: F, marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = "0 0 0 3px #EFF6FF"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? "#93C5FD" : BLUE,
                border: "none",
                borderRadius: 10,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: F,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.15s",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: "#6B7280", fontFamily: F }}>
            No account?{" "}
            <Link to="/register" style={{ color: BLUE, fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
