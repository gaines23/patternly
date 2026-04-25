import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import TopBar from "./TopBar";

const WORK_NAV = [
  { to: "/dashboard",    label: "Overview",     icon: "dashboard" },
  { to: "/projects",     label: "My Projects",  icon: "projects" },
  { to: "/all-projects", label: "All Projects", icon: "allProjects" },
  { to: "/tasks",        label: "Tasks",        icon: "tasks" },
];
const INTEL_NAV = [
  { to: "/patterns",  label: "Patterns",       icon: "patterns" },
  { to: "/generate",  label: "Generate brief",  icon: "generate" },
];
const QUICK_NAV = [
  { to: "/projects/new", label: "New Project", icon: "plus", shortcut: "N" },
];

function NavIcon({ name, size = 18, color }) {
  const s = { width: size, height: size, display: "block" };
  switch (name) {
    case "dashboard": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/>
        <rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/>
      </svg>
    );
    case "generate": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.93 4.93l2.83 2.83M12.24 12.24l2.83 2.83M15.07 4.93l-2.83 2.83M7.76 12.24l-2.83 2.83"/>
      </svg>
    );
    case "projects": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V15a2 2 0 002 2h10a2 2 0 002-2V7"/><path d="M3 7V5.5A1.5 1.5 0 014.5 4H8l1.5 2h6a1.5 1.5 0 011.5 1.5V7"/>
      </svg>
    );
    case "allProjects": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6l7 3.5L17 6"/><path d="M3 10l7 3.5L17 10"/><path d="M3 14l7 3.5L17 14"/>
      </svg>
    );
    case "tasks": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2.5"/><path d="M7 10l2 2 4-4"/>
      </svg>
    );
    case "ingest": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v10M6 9l4 4 4-4"/><path d="M4 15h12"/>
      </svg>
    );
    case "patterns": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7"/><path d="M7 10l2.5-3L13 10M7 13h6"/>
      </svg>
    );
    case "plus": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
        <path d="M10 5v10M5 10h10"/>
      </svg>
    );
    case "settings": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"/>
      </svg>
    );
    case "logout": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 13.5l4-3.5-4-3.5M16 10H7.5"/><path d="M13 4H5.5A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H13"/>
      </svg>
    );
    case "collapse": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 5L7.5 10L12.5 15"/>
      </svg>
    );
    case "expand": return (
      <svg style={s} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 5L12.5 10L7.5 15"/>
      </svg>
    );
    default: return null;
  }
}

const F = "'Plus Jakarta Sans', sans-serif";

function PatternlyMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Patternly mark">
      <rect x="3" y="3" width="38" height="38" rx="8" fill="#1E1B3A" />
      <circle cx="8" cy="10" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="37" cy="10" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="8" cy="22" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="38" cy="26" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="23" cy="37" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="35" cy="36" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="7" cy="34" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <line x1="15" y1="35" x2="15" y2="22" stroke="#9B93E8" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M 15 22 L 25 22 A 6.5 6.5 0 0 0 25 9 L 15 9" stroke="#9B93E8" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15" cy="35" r="2.8" fill="#F5D76E" />
      <circle cx="15" cy="22" r="2.8" fill="#F5D76E" />
      <circle cx="15" cy="9" r="2.8" fill="#F5D76E" />
      <circle cx="25" cy="9" r="2.8" fill="#F5D76E" />
      <circle cx="31.5" cy="15.5" r="2.8" fill="#F5D76E" />
      <circle cx="25" cy="22" r="2.8" fill="#F5D76E" />
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
        border: `1px solid #D4CFE8`,
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
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => { logout(); navigate("/login"); };

  const isActive = (to) =>
    to === "/dashboard"    ? location.pathname === "/dashboard"
    : to === "/projects"    ? location.pathname === "/projects"
    : to === "/all-projects" ? location.pathname === "/all-projects"
    : to === "/tasks"       ? location.pathname === "/tasks"
    : to === "/ingest"      ? location.pathname === "/ingest"
    : to === "/patterns"    ? location.pathname === "/patterns"
    : location.pathname.startsWith(to);

  const NavLink = ({ item, isCollapsed }) => {
    const active = isActive(item.to);
    return (
      <Link to={item.to} onClick={() => setMobileOpen(false)} title={isCollapsed ? item.label : undefined} style={{
        display: "flex", alignItems: "center", gap: isCollapsed ? 0 : 12,
        padding: isCollapsed ? "10px 0" : "10px 14px",
        justifyContent: isCollapsed ? "center" : "flex-start",
        borderRadius: 10, marginBottom: 2, textDecoration: "none",
        background: active ? theme.navActiveBg : "transparent",
        color: active ? theme.navActiveText : theme.navInactiveText,
        fontFamily: F, fontSize: 14, fontWeight: active ? 600 : 500,
        transition: "all 0.15s",
      }}>
        <NavIcon name={item.icon} size={18} color={active ? theme.navActiveText : theme.navInactiveText} />
        {!isCollapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>{item.label}</span>}
      </Link>
    );
  };

  const userInitial = user?.first_name ? user.first_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "?";
  const userName = user?.first_name ? `${user.first_name}`.trim() : user?.email;

  const SidebarFooter = ({ isCollapsed }) => (
    <div ref={userMenuRef} style={{ position: "relative", padding: isCollapsed ? "0 6px 10px" : "0 10px 10px", marginBottom: 10 }}>
      {userMenuOpen && (
        <div style={{
          position: "absolute", bottom: 0, left: "100%", marginLeft: 6, width: 180,
          background: theme.surfaceRaised, border: `1px solid ${theme.border}`, borderRadius: 10,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", overflow: "hidden", zIndex: 10,
        }}>
          <button onClick={toggle}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", width: "100%",
              background: "none", border: "none", cursor: "pointer", color: theme.text,
              fontFamily: F, fontSize: 13, fontWeight: 500, textAlign: "left",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span style={{ fontSize: 15, width: 16, textAlign: "center", lineHeight: 1 }}>{mode === "dark" ? "☀" : "☽"}</span>
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <div style={{ height: 1, background: theme.borderSubtle, margin: "0 14px" }} />
          <Link to="/settings" onClick={() => { setUserMenuOpen(false); setMobileOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              textDecoration: "none", color: theme.text, fontFamily: F, fontSize: 13, fontWeight: 500,
              transition: "background 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <NavIcon name="settings" size={16} color={theme.textMuted} />
            Settings
          </Link>
          <div style={{ height: 1, background: theme.borderSubtle, margin: "0 14px" }} />
          <button onClick={() => { setUserMenuOpen(false); handleLogout(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", width: "100%",
              background: "none", border: "none", cursor: "pointer", color: theme.text,
              fontFamily: F, fontSize: 13, fontWeight: 500, textAlign: "left",
              transition: "background 0.12s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = theme.surfaceAlt}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <NavIcon name="logout" size={16} color={theme.textMuted} />
            Log out
          </button>
        </div>
      )}
      <button onClick={() => setUserMenuOpen(o => !o)} title={isCollapsed ? userName : undefined} style={{
        display: "flex", alignItems: "center", gap: isCollapsed ? 0 : 12,
        padding: isCollapsed ? "12px 0" : "12px 14px",
        justifyContent: isCollapsed ? "center" : "flex-start",
        width: "100%",
        borderTop: `1px solid ${theme.borderSubtle}`, background: "none", border: "none",
        borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: theme.borderSubtle,
        cursor: "pointer", textAlign: "left",
      }}>
        <div style={{
          width: isCollapsed ? 32 : 36, height: isCollapsed ? 32 : 36, borderRadius: "50%", background: "#7C3AED",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isCollapsed ? 13 : 15, fontWeight: 700, color: "#fff", fontFamily: F, flexShrink: 0,
          transition: "all 0.2s",
        }}>{userInitial}</div>
        {!isCollapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>{userName}</div>
              <div style={{ fontSize: 11, color: theme.textFaint, fontFamily: F, textTransform: "capitalize" }}>{user?.role}</div>
            </div>
            <span style={{ fontSize: 16, color: theme.textFaint, flexShrink: 0, transition: "transform 0.2s", transform: userMenuOpen ? "rotate(90deg)" : "none" }}>›</span>
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="fp-app-root" style={{ display: "flex", minHeight: "100vh", background: theme.bg }}>

      {/* Sidebar */}
      <aside className="fp-sidebar" style={{
        width: collapsed ? 64 : 220, background: theme.surface,
        borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 20,
        transition: "width 0.2s ease",
      }}>
        <div style={{ padding: collapsed ? "18px 12px 14px" : "18px 16px 14px", borderBottom: `1px solid ${theme.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start" }}>
          <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <PatternlyMark size={collapsed ? 28 : 32} />
            {!collapsed && <span style={{ fontSize: 16, fontWeight: 600, color: "#9B93E8", fontFamily: F, letterSpacing: "-0.03em", whiteSpace: "nowrap" }}>Patternly</span>}
          </Link>
        </div>
        <nav className="fp-sidebar-nav" style={{ flex: 1, padding: collapsed ? "12px 6px" : "12px 10px", overflowY: "auto" }}>
          {!collapsed && <p style={{ margin: "0 0 6px", padding: "0 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textFaint, fontFamily: F }}>Work</p>}
          {WORK_NAV.map(item => <NavLink key={item.to} item={item} isCollapsed={collapsed} />)}
          {!collapsed ? (
            <div style={{ padding: "6px 0 0" }}>
              <Link to="/projects/new" onClick={() => setMobileOpen(false)} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "10px 14px", borderRadius: 10, textDecoration: "none",
                background: "#9B93E8", color: "#fff",
                fontFamily: F, fontSize: 13, fontWeight: 600,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10"/></svg>
                <span>New Project</span>
              </Link>
            </div>
          ) : (
            <Link to="/projects/new" onClick={() => setMobileOpen(false)} title="New Project" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "10px 0", borderRadius: 10, textDecoration: "none",
              background: "#9B93E8", marginBottom: 2,
            }}>
              <NavIcon name="plus" size={18} color="#fff" />
            </Link>
          )}
          {!collapsed && <p style={{ margin: "14px 0 6px", padding: "0 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textFaint, fontFamily: F }}>Intelligence</p>}
          {collapsed && <div style={{ height: 1, background: theme.borderSubtle, margin: "10px 4px" }} />}
          {INTEL_NAV.map(item => <NavLink key={item.to} item={item} isCollapsed={collapsed} />)}
        </nav>
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: collapsed ? "0 6px 8px" : "0 10px 8px",
            padding: "8px 0", borderRadius: 8,
            border: `1px solid ${theme.borderSubtle}`, background: "transparent",
            cursor: "pointer", color: theme.textMuted,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = theme.surfaceAlt; e.currentTarget.style.color = theme.text; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; }}
        >
          <NavIcon name={collapsed ? "expand" : "collapse"} size={16} color="currentColor" />
        </button>
        <div className="fp-sidebar-footer"><SidebarFooter isCollapsed={collapsed} /></div>
      </aside>

      {/* Mobile header */}
      <div className="fp-mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "0 16px", height: 56, alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <PatternlyMark size={28} />
          <span style={{ fontSize: 15, fontWeight: 500, color: "#9B93E8", fontFamily: F, letterSpacing: "-0.03em" }}>Patternly</span>
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
                <PatternlyMark size={28} />
                <span style={{ fontSize: 15, fontWeight: 500, color: "#9B93E8", fontFamily: F, letterSpacing: "-0.03em" }}>Patternly</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: theme.textMuted }}>✕</button>
            </div>
            <nav style={{ flex: 1, padding: "12px 10px" }}>
              <p style={{ margin: "0 0 6px", padding: "0 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textFaint, fontFamily: F }}>Work</p>
              {WORK_NAV.map(item => <NavLink key={item.to} item={item} />)}
              <p style={{ margin: "14px 0 6px", padding: "0 14px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textFaint, fontFamily: F }}>Intelligence</p>
              {INTEL_NAV.map(item => <NavLink key={item.to} item={item} />)}
            </nav>
            <SidebarFooter />
          </div>
        </>
      )}

      {/* Main content */}
      <main className="fp-main" style={{ marginLeft: collapsed ? 64 : 220, flex: 1, minHeight: "100vh", overflowX: "clip", transition: "margin-left 0.2s ease" }}>
        {!location.pathname.startsWith("/settings") && <TopBar />}
        <div key={location.pathname} className="fp-page-enter">
          {children}
        </div>
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
