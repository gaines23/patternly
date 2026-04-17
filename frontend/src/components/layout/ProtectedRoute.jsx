import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F9FAFB",
      }}>
        <div style={{ textAlign: "center" }}>
          <PatternlySpinner />
          <p style={{
            marginTop: 16,
            fontSize: 14,
            color: "#6B7280",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function PatternlySpinner() {
  return (
    <svg width="40" height="40" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Patternly">
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
      <circle cx="31.5" cy="15.5" r="2.8" fill="#F5D76E" />
      <circle cx="25" cy="22" r="2.8" fill="#F5D76E" />
    </svg>
  );
}
