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
          <FlowpathSpinner />
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

function FlowpathSpinner() {
  return (
    <svg width="40" height="40" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill="#2563EB" />
      <circle cx="9" cy="20" r="4.5" fill="white" />
      <circle cx="18" cy="13" r="3" fill="white" fillOpacity="0.55" />
      <circle cx="27" cy="20" r="4.5" fill="white" />
      <circle cx="27" cy="20" r="1.8" fill="#2563EB" />
      <path d="M13 17.5 Q18 9 23 17.5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
