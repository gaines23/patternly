import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useAcceptInvite } from "../../hooks/useUsers";
import publicApi from "../../api/publicClient";
import { PatternlyMark } from "@components/brand/PatternlyMark";

const F = "'Plus Jakarta Sans', sans-serif";

// Header lockup for the register page: the Patternly icon next to the
// inviting team's logo (or name fallback). Co-branding signals to the
// invitee which team they're about to join the second the page loads.
function BrandLockup({ team, theme }) {
  return (
    <Link
      to="/login"
      style={{
        display: "inline-flex", alignItems: "center", gap: 14,
        textDecoration: "none",
      }}
    >
      <PatternlyMark size={40} />
      {team && (
        <>
          <span aria-hidden="true" style={{
            display: "inline-block", width: 1, height: 28,
            background: theme.borderInput,
          }} />
          {team.logo ? (
            <img
              src={team.logo}
              alt={team.name ? `${team.name} logo` : "Team logo"}
              style={{ height: 36, maxWidth: 140, objectFit: "contain", display: "block" }}
            />
          ) : (
            <span style={{
              fontSize: 16, fontWeight: 600, color: theme.text,
              fontFamily: F, letterSpacing: "-0.01em",
            }}>
              {team.name}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

export default function RegisterPage() {
  const { user, register, refreshUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");
  const acceptInvite = useAcceptInvite();

  const [tokenState, setTokenState] = useState("checking"); // checking | valid | invalid
  const [invitedTeam, setInvitedTeam] = useState(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setTokenState("invalid");
      return;
    }
    publicApi.get(`/v1/users/invites/${inviteToken}/`)
      .then((res) => {
        setTokenState("valid");
        setInvitedTeam(res.data.team || null);
        if (res.data.email) {
          setForm((f) => ({ ...f, email: res.data.email }));
        }
      })
      .catch(() => setTokenState("invalid"));
  }, [inviteToken]);

  // If a logged-in user lands on this page with a valid invite, treat it as
  // an existing-user team join: hit the accept endpoint, refresh the auth
  // context (which now has the new active team), and bounce them to dashboard.
  useEffect(() => {
    if (!user || tokenState !== "valid" || !inviteToken) return;
    let cancelled = false;
    (async () => {
      try {
        await acceptInvite.mutateAsync(inviteToken);
        await refreshUser();
        if (!cancelled) navigate("/dashboard", { replace: true });
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.detail || "Could not accept this invite.";
          setError(msg);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tokenState, inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ ...form, invite_token: inviteToken });
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
  const focusStyle = (e) => { e.target.style.borderColor = theme.blue; e.target.style.boxShadow = `0 0 0 3px ${theme.blueLight}`; };
  const blurStyle = (e) => { e.target.style.borderColor = theme.borderInput; e.target.style.boxShadow = "none"; };

  if (tokenState === "checking" || (user && tokenState === "valid" && !error)) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: theme.textMuted, fontFamily: F, fontSize: 14 }}>
          {user ? `Joining ${invitedTeam?.name || "team"}…` : "Verifying invite…"}
        </p>
      </div>
    );
  }

  if (tokenState === "invalid") {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
          <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
            {/* No team data on an invalid token — show the Patternly mark alone. */}
            <BrandLockup team={null} theme={theme} />
          </div>
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
            <p style={{ fontSize: 32, margin: "0 0 12px" }}>🔒</p>
            <h1 style={{ margin: "0 0 8px", fontSize: 20, fontFamily: F, fontWeight: 500, letterSpacing: "-0.025em", color: theme.text }}>Invite required</h1>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: theme.textMuted, fontFamily: F, lineHeight: 1.6 }}>
              Account creation requires a valid invite link. Please ask an existing user to send you one.
            </p>
            <Link
              to="/login"
              style={{ display: "inline-block", padding: "10px 24px", background: theme.blue, borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, textDecoration: "none" }}
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <BrandLockup team={invitedTeam} theme={theme} />
        </div>

        <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontFamily: F, fontWeight: 500, letterSpacing: "-0.025em", color: theme.text }}>Create account</h1>
          <p style={{ margin: "0 0 24px", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            {invitedTeam
              ? <>You&apos;ve been invited to join <strong style={{ color: theme.text }}>{invitedTeam.name}</strong>. Finish setting up your account below.</>
              : <>You&apos;ve been invited. Finish setting up your account below.</>}
          </p>
          {invitedTeam && (
            <p style={{ margin: "-12px 0 18px", fontSize: 12, color: theme.textFaint, fontFamily: F }}>
              Already have an account?{" "}
              <Link to={`/login?next=/register?token=${inviteToken}`} style={{ color: theme.blue, fontWeight: 600 }}>
                Sign in to join {invitedTeam.name}
              </Link>
            </p>
          )}

          {error && (
            <div style={{ padding: "11px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, marginBottom: 18, fontSize: 13, color: "#DC2626", fontFamily: F }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 5 }}>First name</label>
                <input type="text" required value={form.first_name} onChange={set("first_name")} placeholder="Alex" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 5 }}>Last name</label>
                <input type="text" value={form.last_name} onChange={set("last_name")} placeholder="Johnson" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 5 }}>Email</label>
              <input type="email" required value={form.email} onChange={set("email")} placeholder="you@company.com" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 5 }}>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="Min 8 characters" style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: 12, background: loading ? theme.blueSubtle : theme.blue, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: F, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: theme.blue, fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
