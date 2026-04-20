import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "./hooks/useAuth";
import { useTheme } from "./hooks/useTheme";
import { createMuiTheme } from "./utils/muiTheme";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ProjectListPage from "./pages/project/ProjectListPage";
import NewProjectPage from "./pages/project/NewProjectPage";
import ProjectDetailPage from "./pages/project/ProjectDetailPage";
import EditProjectPage from "./pages/project/EditProjectPage";
import GeneratePage from "./pages/generate/GeneratePage";
import SettingsPage from "./pages/settings/SettingsPage";
import SharedBriefPage from "./pages/shared/SharedBriefPage";
import ClientBriefPage from "./pages/shared/ClientBriefPage";
import TasksPage from "./pages/tasks/TasksPage";
import IngestPage from "./pages/ingest/IngestPage";

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

/** Reads the custom theme mode and provides a matching MUI theme to the tree. */
function MuiThemeSync({ children }) {
  const { mode } = useTheme();
  return (
    <MuiThemeProvider theme={createMuiTheme(mode)}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}

export default function App() {
  return (
    <MuiThemeSync>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/brief/:shareToken" element={<SharedBriefPage />} />
          <Route path="/client-brief/:shareToken" element={<ClientBriefPage />} />

          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/generate" element={<Protected><GeneratePage /></Protected>} />
          <Route path="/projects" element={<Protected><ProjectListPage /></Protected>} />
          <Route path="/projects/new" element={<Protected><NewProjectPage /></Protected>} />
          <Route path="/projects/:id" element={<Protected><ProjectDetailPage /></Protected>} />
          <Route path="/projects/:id/edit" element={<Protected><EditProjectPage /></Protected>} />
          <Route path="/tasks" element={<Protected><TasksPage /></Protected>} />
          <Route path="/ingest" element={<Protected><IngestPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>404</p>
                <p style={{ color: "#6B7280", marginBottom: 20 }}>Page not found</p>
                <a href="/dashboard" style={{ color: "#9B93E8", fontWeight: 600 }}>Go to dashboard →</a>
              </div>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </MuiThemeSync>
  );
}
