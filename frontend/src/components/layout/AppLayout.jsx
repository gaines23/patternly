import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

const NAV = [
  { to: "/dashboard",    label: "Dashboard",     icon: "◈" },
  { to: "/generate",     label: "Generate",       icon: "✨" },
  { to: "/case-files",   label: "Case Files",     icon: "◎" },
  { to: "/case-files/new", label: "New Case File", icon: "+" },
];

const F = "'Plus Jakarta Sans', sans-serif";

function FlowpathMark({ size = 32, blue }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill={blue} />
      <circle cx="9" cy="20" r="4.5" fill="white" />
      <circle cx="18" cy="13" r="3" fill="white" fillOpacity="0.55" />
      <circle cx="27" cy="20" r="4.5" fill="white" />
      <circle cx="27" cy="20" r="1.8" fill={blue} />
      <path d="M13 17.5 Q18 9 23 17.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function ThemeToggle({ mode, onToggle, theme }) {
  return (
    <button
      onClick={onToggle}
      title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        background: "transparent",
        color: theme.textMuted,
        fontSize: 15,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = theme.surfaceAlt; e.currentTarget.style.color = theme.text; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; }}
    >
      {mode === "dark" ? "☀" : "☽"}
    </button>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const { mode, toggle, theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/login"); };

  const isActive = (to) =>
    to === "/dashboard" ? location.pathname === "/dashboard"
    : to === "/case-files" ? location.pathname === "/case-files"
    : location.pathname.startsWith(to);

  const NavLink = ({ item }) => (
    <Link to={item.to} onClick={() => setMobileOpen(false)} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
      borderRadius: 8, marginBottom: 2, textDecoration: "none",
      background: isActive(item.to) ? theme.navActiveBg : "transparent",
      color: isActive(item.to) ? theme.navActiveText : theme.navInactiveText,
      fontFamily: F, fontSize: 13,
      fontWeight: isActive(item.to) ? 700 : 500,
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
      {item.label}
    </Link>
  );

  const SidebarFooter = () => (
    <div style={{ padding: "12px 14px", borderTop: `1px solid ${theme.borderSubtle}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSec, fontFamily: F, marginBottom: 2 }}>
        {user?.first_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email}
      </div>
      <div style={{ fontSize: 11, color: theme.textFaint, fontFamily: F, marginBottom: 10, textTransform: "capitalize" }}>
        {user?.role}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <Link to="/settings" style={{ flex: 1, padding: "7px 10px", background: "transparent", border: `1px solid ${theme.borderInput}`, borderRadius: 7, color: theme.textMuted, fontSize: 12, fontWeight: 500, fontFamily: F, cursor: "pointer", textAlign: "center", textDecoration: "none" }}>
          Settings
        </Link>
        <ThemeToggle mode={mode} onToggle={toggle} theme={theme} />
        <button onClick={handleLogout} style={{ flex: 1, padding: "7px 10px", background: "transparent", border: `1px solid ${theme.borderInput}`, borderRadius: 7, color: theme.textMuted, fontSize: 12, fontWeight: 500, fontFamily: F, cursor: "pointer" }}>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: theme.bg }}>

      {/* Sidebar */}
      <aside className="fp-sidebar" style={{ width: 220, background: theme.surface, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 20 }}>
        <div style={{ padding: "18px 16px 14px", borderBottom: `1px solid ${theme.borderSubtle}` }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <FlowpathMark size={32} blue={theme.blue} />
            <div>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: theme.text, fontFamily: F, letterSpacing: "-0.04em" }}>flow</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: theme.blue, fontFamily: F, letterSpacing: "-0.04em" }}>path</span>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: theme.textFaint, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: F }}>
                Workflow Intelligence
              </div>
            </div>
          </Link>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {NAV.map(item => <NavLink key={item.to} item={item} />)}
        </nav>
        <SidebarFooter />
      </aside>

      {/* Mobile header */}
      <div className="fp-mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "0 16px", height: 56, alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <FlowpathMark size={28} blue={theme.blue} />
          <span style={{ fontSize: 15, fontWeight: 800, color: theme.text, fontFamily: F, letterSpacing: "-0.04em" }}>
            flow<span style={{ color: theme.blue }}>path</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle mode={mode} onToggle={toggle} theme={theme} />
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: theme.textSec, lineHeight: 1 }} aria-label="Open menu">☰</button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
          <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, background: theme.surface, zIndex: 50, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 16px", borderBottom: `1px solid ${theme.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <FlowpathMark size={28} blue={theme.blue} />
                <span style={{ fontSize: 15, fontWeight: 800, color: theme.text, fontFamily: F }}>
                  flow<span style={{ color: theme.blue }}>path</span>
                </span>
              </Link>
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textMuted }}>✕</button>
            </div>
            <nav style={{ flex: 1, padding: "12px 10px" }}>
              {NAV.map(item => <NavLink key={item.to} item={item} />)}
              <NavLink item={{ to: "/settings", label: "Settings", icon: "⚙️" }} />
            </nav>
            <div style={{ padding: "12px 14px", borderTop: `1px solid ${theme.borderSubtle}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>{user?.email}</div>
              <button onClick={handleLogout} style={{ marginTop: 10, width: "100%", padding: 10, border: `1px solid ${theme.borderInput}`, borderRadius: 8, background: "transparent", color: theme.textMuted, fontFamily: F, fontSize: 13, cursor: "pointer" }}>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="fp-main" style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .fp-sidebar { display: none !important; }
          .fp-mobile-header { display: flex !important; }
          .fp-main { margin-left: 0 !important; padding-top: 56px; }
        }
      `}</style>
    </div>
  );
}
