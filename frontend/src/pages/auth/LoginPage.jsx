import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

import { PatternlyMark } from "@components/brand/PatternlyMark";

const F = "'Plus Jakarta Sans', sans-serif";

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordReset = location.state?.passwordReset;

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
    border: `1.5px solid ${theme.borderInput}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: F,
    color: theme.text,
    background: theme.inputBg,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <PatternlyMark />
              <span style={{ fontSize: 28, fontWeight: 500, color: theme.text, fontFamily: F, letterSpacing: "-0.03em" }}>Patternly</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: theme.textFaint, fontFamily: F }}>Spot the pattern. Skip the meeting</p>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          padding: "32px 28px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontFamily: "'Fraunces', serif", color: theme.text }}>
            Sign in
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            Log in to access the project builder.
          </p>

          {passwordReset && (
            <div style={{
              padding: "11px 14px",
              background: "#F0FDF4",
              border: "1px solid #BBF7D0",
              borderRadius: 8,
              marginBottom: 18,
              fontSize: 13,
              color: "#16A34A",
              fontFamily: F,
            }}>
              Password updated. Sign in with your new password.
            </div>
          )}

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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 6 }}>
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
                onFocus={(e) => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; }}
                onBlur={(e) => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: theme.blue, fontWeight: 500, fontFamily: F }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; }}
                onBlur={(e) => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                background: loading ? theme.blueSubtle : theme.blue,
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

          {/* <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            No account?{" "}
            <Link to="/register" style={{ color: theme.blue, fontWeight: 600 }}>
              Create one
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  );
}
