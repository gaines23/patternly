import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { F } from "../constants";
import { useAuth } from "@hooks/useAuth";
import {
  useClickUpIntegration,
  useConnectClickUp,
  useConnectClickUpToken,
  useDisconnectClickUp,
  useValidateClickUpToken,
} from "@hooks/useProjectIntegration";

const ERROR_LABELS = {
  invalid_state: "Connection link expired or was tampered with. Try again.",
  state_expired: "Connection link expired. Try again.",
  missing_params: "ClickUp didn't return the expected response. Try again.",
  case_file_not_found: "Project no longer exists.",
  user_not_active: "Your account is no longer active.",
  permission_revoked: "You no longer have permission to manage this project's integrations.",
  clickup_api_error: "ClickUp rejected the connection request. Try again.",
  no_workspaces: "Your ClickUp account has no accessible workspaces.",
  unexpected_error: "Something went wrong. Try again.",
};

function StatusBadge({ active }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: F,
      color: active ? "#059669" : "#6B7280",
      background: active ? "#ECFDF5" : "#F3F4F6",
      border: `1px solid ${active ? "#A7F3D0" : "#E5E7EB"}`,
      borderRadius: 8, padding: "2px 8px",
    }}>
      {active ? "Connected" : "Not connected"}
    </span>
  );
}

function MethodBadge({ method }) {
  if (!method) return null;
  const label = method === "personal_token" ? "API Token" : "OAuth";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: F,
      color: "#0284C7", background: "#E0F2FE",
      border: "1px solid #BAE6FD",
      borderRadius: 6, padding: "2px 8px",
      textTransform: "uppercase", letterSpacing: "0.05em",
    }}>
      {label}
    </span>
  );
}

function readApiErrorDetail(err) {
  return err?.response?.data?.detail || err?.message || "Something went wrong.";
}

/**
 * Body content for the "Integrations" section. Wrapped in <Section> by the
 * caller so the colored header bar matches other sections on the page.
 */
export default function IntegrationsCard({ caseFileId, theme }) {
  const { user } = useAuth();
  const userRole = user?.role;
  const canManage = userRole === "admin" || userRole === "engineer";

  const { data, isLoading, refetch } = useClickUpIntegration(caseFileId);
  const connect = useConnectClickUp(caseFileId);
  const disconnect = useDisconnectClickUp(caseFileId);
  const validateToken = useValidateClickUpToken(caseFileId);
  const connectToken = useConnectClickUpToken(caseFileId);
  const location = useLocation();
  const navigate = useNavigate();

  const [banner, setBanner] = useState(null); // { kind: "success"|"error", text }

  // Token-paste state machine
  const [tokenInput, setTokenInput] = useState("");
  const [tokenWorkspaces, setTokenWorkspaces] = useState(null); // [{id,name,color}] or null
  const [pickedWorkspaceId, setPickedWorkspaceId] = useState("");
  const [tokenError, setTokenError] = useState("");

  // Pick up the OAuth result the backend appended on redirect, refresh the
  // status query, and scrub the params so a refresh doesn't re-trigger this.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const result = params.get("integration");
    if (!result) return;
    if (result === "connected") {
      setBanner({ kind: "success", text: "ClickUp connected." });
      refetch();
    } else if (result === "error") {
      const reason = params.get("reason");
      setBanner({ kind: "error", text: ERROR_LABELS[reason] || "Connection failed." });
    }
    params.delete("integration");
    params.delete("reason");
    const next = `${location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    navigate(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const connection = data?.connection;
  const isConnected = !!data?.connected;

  const resetTokenForm = () => {
    setTokenInput("");
    setTokenWorkspaces(null);
    setPickedWorkspaceId("");
    setTokenError("");
  };

  const handleValidate = async () => {
    if (!tokenInput.trim()) return;
    setTokenError("");
    try {
      const res = await validateToken.mutateAsync(tokenInput.trim());
      const ws = res.workspaces || [];
      setTokenWorkspaces(ws);
      setPickedWorkspaceId(ws.length === 1 ? String(ws[0].id) : "");
    } catch (err) {
      setTokenError(readApiErrorDetail(err));
      setTokenWorkspaces(null);
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim() || !pickedWorkspaceId) return;
    setTokenError("");
    try {
      await connectToken.mutateAsync({
        accessToken: tokenInput.trim(),
        workspaceId: pickedWorkspaceId,
      });
      setBanner({ kind: "success", text: "ClickUp connected." });
      resetTokenForm();
    } catch (err) {
      const data = err?.response?.data;
      setTokenError(readApiErrorDetail(err));
      // Backend returns workspaces alongside a 400 when the token has multiple;
      // surface the picker even on this "soft" error.
      if (data?.workspaces) {
        setTokenWorkspaces(data.workspaces);
        setPickedWorkspaceId("");
      }
    }
  };

  const buttonStyle = (variant, disabled) => ({
    fontSize: 12, fontWeight: 700, fontFamily: F,
    border: "1px solid",
    borderRadius: 8, padding: "6px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    color: variant === "primary" ? "#fff" : "#0284C7",
    background: variant === "primary" ? "#0284C7" : "#E0F2FE",
    borderColor: variant === "primary" ? "#0284C7" : "#BAE6FD",
    alignSelf: "flex-start",
  });

  return (
    <>
      {banner && (
        <div style={{
          fontSize: 12, fontFamily: F, marginBottom: 12,
          padding: "8px 10px", borderRadius: 8,
          color: banner.kind === "success" ? "#065F46" : "#991B1B",
          background: banner.kind === "success" ? "#ECFDF5" : "#FEF2F2",
          border: `1px solid ${banner.kind === "success" ? "#A7F3D0" : "#FECACA"}`,
        }}>
          {banner.text}
        </div>
      )}

      {/* ClickUp row */}
      <div style={{
        border: `1.5px solid ${isConnected ? "#A7F3D0" : "#BAE6FD"}`,
        borderRadius: 10,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: F }}>ClickUp</span>
          <StatusBadge active={isConnected} />
          {isConnected && <MethodBadge method={connection?.auth_method} />}
        </div>

        {isLoading ? (
          <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>Loading…</p>
        ) : isConnected ? (
          <>
            <p style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: F }}>
              Workspace <strong>{connection?.workspace_name || connection?.workspace_id}</strong>
            </p>
            <button
              type="button"
              disabled={!canManage || disconnect.isPending}
              onClick={() => disconnect.mutate()}
              style={buttonStyle("secondary", !canManage || disconnect.isPending)}
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 12, color: theme.textSec, fontFamily: F }}>
              Connect this project to a ClickUp workspace to enable build export.
            </p>

            {/* Method 1: OAuth */}
            <div>
              <p style={{
                margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: theme.textFaint,
                fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Method 1 — OAuth
              </p>
              <button
                type="button"
                disabled={!canManage || connect.isPending}
                onClick={() => connect.mutate()}
                style={buttonStyle("primary", !canManage || connect.isPending)}
              >
                {connect.isPending ? "Redirecting to ClickUp…" : "Connect with OAuth"}
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: theme.border }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.textFaint, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.08em" }}>or</span>
              <div style={{ flex: 1, height: 1, background: theme.border }} />
            </div>

            {/* Method 2: Personal Token */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{
                margin: 0, fontSize: 11, fontWeight: 700, color: theme.textFaint,
                fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Method 2 — Personal API Token
              </p>
              <p style={{ margin: 0, fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                Generate one in ClickUp under <strong>Settings → My Apps → API Token</strong>.
              </p>
              <input
                type="password"
                placeholder="pk_…"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  if (tokenWorkspaces) {
                    // Re-validation needed if they edit the token after validating
                    setTokenWorkspaces(null);
                    setPickedWorkspaceId("");
                  }
                  setTokenError("");
                }}
                disabled={!canManage || validateToken.isPending || connectToken.isPending}
                style={{
                  fontSize: 12, fontFamily: "monospace",
                  padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${tokenError ? "#FECACA" : theme.borderInput}`,
                  background: theme.surfaceAlt || theme.surface,
                  color: theme.text, width: "100%", boxSizing: "border-box",
                }}
              />

              {tokenError && (
                <p style={{ margin: 0, fontSize: 11, color: "#991B1B", fontFamily: F }}>
                  {tokenError}
                </p>
              )}

              {tokenWorkspaces && tokenWorkspaces.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{
                    margin: 0, fontSize: 11, fontWeight: 600, color: theme.textFaint,
                    fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
                  }}>
                    Workspace
                  </label>
                  <select
                    value={pickedWorkspaceId}
                    onChange={(e) => setPickedWorkspaceId(e.target.value)}
                    disabled={!canManage || connectToken.isPending}
                    style={{
                      fontSize: 12, fontFamily: F,
                      padding: "8px 10px", borderRadius: 8,
                      border: `1px solid ${theme.borderInput}`,
                      background: theme.surfaceAlt || theme.surface,
                      color: theme.text,
                    }}
                  >
                    <option value="">Select a workspace…</option>
                    {tokenWorkspaces.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                {!tokenWorkspaces ? (
                  <button
                    type="button"
                    disabled={!canManage || !tokenInput.trim() || validateToken.isPending}
                    onClick={handleValidate}
                    style={buttonStyle("secondary", !canManage || !tokenInput.trim() || validateToken.isPending)}
                  >
                    {validateToken.isPending ? "Checking…" : "Validate token"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={!canManage || !pickedWorkspaceId || connectToken.isPending}
                      onClick={handleSaveToken}
                      style={buttonStyle("primary", !canManage || !pickedWorkspaceId || connectToken.isPending)}
                    >
                      {connectToken.isPending ? "Saving…" : "Connect with token"}
                    </button>
                    <button
                      type="button"
                      onClick={resetTokenForm}
                      style={buttonStyle("secondary", false)}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>

            {!canManage && (
              <p style={{ margin: 0, fontSize: 11, color: theme.textFaint, fontFamily: F, fontStyle: "italic" }}>
                Only admins and engineers can manage integrations.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
