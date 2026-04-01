import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import CaseFileListPage from "./pages/casefile/CaseFileListPage";
import NewCaseFilePage from "./pages/casefile/NewCaseFilePage";
import CaseFileDetailPage from "./pages/casefile/CaseFileDetailPage";
import EditCaseFilePage from "./pages/casefile/EditCaseFilePage";
import GeneratePage from "./pages/generate/GeneratePage";
import SettingsPage from "./pages/settings/SettingsPage";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/generate" element={<Protected><GeneratePage /></Protected>} />
          <Route path="/case-files" element={<Protected><CaseFileListPage /></Protected>} />
          <Route path="/case-files/new" element={<Protected><NewCaseFilePage /></Protected>} />
          <Route path="/case-files/:id" element={<Protected><CaseFileDetailPage /></Protected>} />
          <Route path="/case-files/:id/edit" element={<Protected><EditCaseFilePage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>404</p>
                <p style={{ color: "#6B7280", marginBottom: 20 }}>Page not found</p>
                <a href="/dashboard" style={{ color: "#2563EB", fontWeight: 600 }}>Go to dashboard →</a>
              </div>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
