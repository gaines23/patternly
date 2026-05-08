import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import {
  useUpdateMe, useChangePassword, useCreateInvite,
  useAuditLogs, useSignOutAll, useAdminUsers, useAdminUpdateUser,
  useMyTeam, useUpdateMyTeam, useMyTeams, useSwitchTeam,
} from "../../hooks/useUsers";
import {
  usePlatforms, usePlatformKnowledge, useCommunityInsights,
  useTrainingCaseFiles,
} from "../../hooks/useIngest";

const F = "'Plus Jakarta Sans', sans-serif";

// ── Shared primitives ─────────────────────────────────────────────────────────

function Card({ title, sub, children, theme }) {
  return (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme.text, fontFamily: F }}>{title}</p>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 12, color: theme.textFaint, fontFamily: F }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function InputRow({ label, children, theme }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: theme.textSec, fontFamily: F }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled, theme }) {
  const [f, setF] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setF(true)}
      onBlur={() => setF(false)}
      style={{
        width: "100%", boxSizing: "border-box", padding: "9px 13px",
        border: `1.5px solid ${f ? theme.blue : theme.borderInput}`,
        borderRadius: 9, fontFamily: F, fontSize: 14, color: theme.text,
        background: disabled ? theme.inputBgDisabled : theme.inputBg,
        outline: "none", boxShadow: f ? `0 0 0 3px ${theme.blueLight}` : "none",
        transition: "all 0.15s",
      }}
    />
  );
}

function Alert({ type, message }) {
  const s = type === "success"
    ? { bg: "#ECFDF5", border: "#6EE7B7", color: "#059669" }
    : { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" };
  return (
    <div style={{ padding: "11px 14px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, marginTop: 16, fontSize: 13, color: s.color, fontFamily: F }}>
      {message}
    </div>
  );
}

function Btn({ onClick, disabled, pending, label, pendingLabel, variant = "primary", theme }) {
  const styles = {
    primary: { bg: disabled ? theme.blueSubtle : theme.blue, color: "#fff", border: "none" },
    danger:  { bg: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" },
  };
  const s = styles[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ padding: "9px 22px", background: s.bg, border: s.border, borderRadius: 9, color: s.color, fontSize: 13, fontWeight: 700, fontFamily: F, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s" }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange, theme }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: `1px solid ${theme.border}`, paddingBottom: 0 }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "9px 18px",
              fontFamily: F,
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? theme.blue : theme.textSec,
              background: "none",
              border: "none",
              borderBottom: isActive ? `2px solid ${theme.blue}` : "2px solid transparent",
              marginBottom: -1,
              cursor: "pointer",
              transition: "all 0.15s",
              borderRadius: 0,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function AccountTab({ user, mode, toggle, theme, updateMe, profile, setProfile, profileMsg, handleProfileSave }) {
  return (
    <>
      <Card title="Profile" sub="Update your name and display information." theme={theme}>
        <form onSubmit={handleProfileSave}>
          <InputRow label="Email" theme={theme}>
            <TextInput value={user?.email || ""} onChange={() => {}} disabled theme={theme} />
          </InputRow>
          <InputRow label="First name" theme={theme}>
            <TextInput value={profile.first_name} onChange={v => setProfile(p => ({ ...p, first_name: v }))} placeholder="First name" theme={theme} />
          </InputRow>
          <InputRow label="Last name" theme={theme}>
            <TextInput value={profile.last_name} onChange={v => setProfile(p => ({ ...p, last_name: v }))} placeholder="Last name" theme={theme} />
          </InputRow>
          <InputRow label="Role" theme={theme}>
            <TextInput value={user?.role || ""} onChange={() => {}} disabled theme={theme} />
          </InputRow>
          {profileMsg && <Alert type={profileMsg.type} message={profileMsg.message} />}
          <div style={{ marginTop: 18 }}>
            <Btn type="submit" onClick={handleProfileSave} disabled={updateMe.isPending} pending={updateMe.isPending} label="Save changes" pendingLabel="Saving…" theme={theme} />
          </div>
        </form>
      </Card>

      <Card title="Appearance" sub="Choose how Patternly looks on your device." theme={theme}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>
              {mode === "dark" ? "Dark mode" : "Light mode"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>
              {mode === "dark" ? "Switch to a lighter interface" : "Switch to a darker interface"}
            </p>
          </div>
          <button
            onClick={toggle}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", background: theme.blueLight, border: `1px solid ${theme.blueBorder}`, borderRadius: 9, color: theme.blue, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", transition: "all 0.15s" }}
          >
            <span style={{ fontSize: 15 }}>{mode === "dark" ? "☀" : "☽"}</span>
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </Card>

      <Card title="Account" sub="Read-only account details." theme={theme}>
        <InputRow label="Account ID" theme={theme}>
          <TextInput value={user?.id || ""} onChange={() => {}} disabled theme={theme} />
        </InputRow>
        <InputRow label="Member since" theme={theme}>
          <TextInput
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
            onChange={() => {}} disabled theme={theme}
          />
        </InputRow>
      </Card>
    </>
  );
}

function SecurityTab({ user, theme, changePassword, passwords, setPasswords, passwordMsg, handlePasswordSave, signOutAll, signOutMsg, handleSignOutAll, auditLogs }) {
  return (
    <>
      <Card title="Password" sub="Change your account password. Minimum 8 characters." theme={theme}>
        <form onSubmit={handlePasswordSave}>
          <InputRow label="Current password" theme={theme}>
            <TextInput type="password" value={passwords.current_password} onChange={v => setPasswords(p => ({ ...p, current_password: v }))} placeholder="••••••••" theme={theme} />
          </InputRow>
          <InputRow label="New password" theme={theme}>
            <TextInput type="password" value={passwords.new_password} onChange={v => setPasswords(p => ({ ...p, new_password: v }))} placeholder="Min 8 characters" theme={theme} />
          </InputRow>
          <InputRow label="Confirm new" theme={theme}>
            <TextInput type="password" value={passwords.confirm} onChange={v => setPasswords(p => ({ ...p, confirm: v }))} placeholder="Repeat new password" theme={theme} />
          </InputRow>
          {passwordMsg && <Alert type={passwordMsg.type} message={passwordMsg.message} />}
          <div style={{ marginTop: 18 }}>
            <Btn onClick={handlePasswordSave} disabled={changePassword.isPending} pending={changePassword.isPending} label="Change password" pendingLabel="Changing…" theme={theme} />
          </div>
        </form>
      </Card>

      <Card title="Session security" sub="Manage active sessions across all your devices." theme={theme}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "8px 0", gap: 16 }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>Sign out of all devices</p>
            <p style={{ margin: 0, fontSize: 12, color: theme.textFaint, fontFamily: F }}>
              Invalidates all active sessions everywhere. Your current session stays active.
            </p>
          </div>
          <button
            onClick={handleSignOutAll}
            disabled={signOutAll.isPending}
            style={{ flexShrink: 0, padding: "9px 18px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: signOutAll.isPending ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
          >
            {signOutAll.isPending ? "Signing out…" : "Sign out all"}
          </button>
        </div>
        {signOutMsg && <Alert type={signOutMsg.type} message={signOutMsg.message} />}
      </Card>

      <Card
        title="Activity log"
        sub={user?.role === "admin" ? "All security events across your organization." : "Recent security events for your account."}
        theme={theme}
      >
        {auditLogs.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, padding: "8px 0" }}>Loading…</p>}
        {auditLogs.isError && <p style={{ fontSize: 13, color: "#DC2626", fontFamily: F, padding: "8px 0" }}>Failed to load activity log.</p>}
        {auditLogs.data?.results?.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, padding: "8px 0" }}>No activity recorded yet.</p>}
        {auditLogs.data?.results?.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: F }}>
              <thead>
                <tr>
                  {user?.role === "admin" && <th style={{ textAlign: "left", padding: "8px 10px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" }}>User</th>}
                  <th style={{ textAlign: "left", padding: "8px 10px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" }}>Event</th>
                  <th style={{ textAlign: "left", padding: "8px 10px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "8px 10px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" }}>IP Address</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" }}>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.data.results.map((entry) => (
                  <tr key={entry.id}>
                    {user?.role === "admin" && (
                      <td style={{ padding: "9px 10px 9px 0", color: theme.textSec, borderBottom: `1px solid ${theme.borderSubtle}`, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.user_email || "—"}
                      </td>
                    )}
                    <td style={{ padding: "9px 10px 9px 0", color: theme.text, fontWeight: 500, borderBottom: `1px solid ${theme.borderSubtle}`, whiteSpace: "nowrap" }}>{entry.action_display}</td>
                    <td style={{ padding: "9px 10px 9px 0", borderBottom: `1px solid ${theme.borderSubtle}`, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: entry.success ? "#ECFDF5" : "#FEF2F2", color: entry.success ? "#059669" : "#DC2626" }}>
                        {entry.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td style={{ padding: "9px 10px 9px 0", color: theme.textSec, borderBottom: `1px solid ${theme.borderSubtle}`, fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{entry.ip_address || "—"}</td>
                    <td style={{ padding: "9px 0", color: theme.textFaint, borderBottom: `1px solid ${theme.borderSubtle}`, whiteSpace: "nowrap" }}>
                      {new Date(entry.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function TeamTab({ user, theme, createInvite, inviteLink, setInviteLink, inviteCopied, setInviteCopied, handleCreateInvite, handleCopyInvite, isAdmin, adminUsers, adminUpdateUser, myTeam, updateMyTeam, myTeams, switchTeam, refreshUser }) {
  const [teamName, setTeamName] = useState("");
  const [teamMsg, setTeamMsg] = useState(null);
  const [logoMsg, setLogoMsg] = useState(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (myTeam?.data?.name) setTeamName(myTeam.data.name);
  }, [myTeam?.data?.name]);

  const handleTeamSave = async (e) => {
    e.preventDefault();
    setTeamMsg(null);
    const name = teamName.trim();
    if (!name) {
      setTeamMsg({ type: "error", message: "Team name is required." });
      return;
    }
    try {
      await updateMyTeam.mutateAsync({ name });
      setTeamMsg({ type: "success", message: "Team updated." });
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to update team.";
      setTeamMsg({ type: "error", message: msg });
    }
  };

  const LOGO_MAX_BYTES = 2 * 1024 * 1024;
  const LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
  const currentLogoUrl = myTeam?.data?.logo || null;

  const handleLogoPick = async (e) => {
    setLogoMsg(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) {
      setLogoMsg({ type: "error", message: "Logo must be a PNG, JPEG, or WebP image." });
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoMsg({ type: "error", message: "Logo must be 2 MB or smaller." });
      return;
    }
    try {
      await updateMyTeam.mutateAsync({ logo: file });
      setLogoMsg({ type: "success", message: "Logo updated." });
    } catch (err) {
      const detail = err.response?.data?.logo?.[0] || err.response?.data?.detail || "Failed to upload logo.";
      setLogoMsg({ type: "error", message: detail });
    }
  };

  const handleLogoRemove = async () => {
    setLogoMsg(null);
    try {
      await updateMyTeam.mutateAsync({ logo_clear: true });
      setLogoMsg({ type: "success", message: "Logo removed." });
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to remove logo.";
      setLogoMsg({ type: "error", message: msg });
    }
  };

  const teams = myTeams?.data?.results || myTeams?.data || [];
  const activeTeamId = user?.active_team?.id;

  const handleSwitch = async (teamId) => {
    if (teamId === activeTeamId) return;
    try {
      await switchTeam.mutateAsync(teamId);
      // useAuth keeps its own copy of the user — re-fetch so the UI everywhere
      // reflects the new active team without a hard reload.
      if (refreshUser) await refreshUser();
    } catch {
      // Mutation surfaces its own error state on the button.
    }
  };

  return (
    <>
      {teams.length > 1 && (
        <Card title="Your teams" sub="You belong to multiple teams. Switch to change which team's projects, library, and members you see." theme={theme}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
            {teams.map((m) => {
              const isCurrent = m.team.id === activeTeamId;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, padding: "10px 14px",
                    background: isCurrent ? theme.blueLight : theme.surface,
                    border: `1px solid ${isCurrent ? theme.blueBorder : theme.borderSubtle}`,
                    borderRadius: 9,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>{m.team.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                      {m.role}{isCurrent ? " · current" : ""}
                    </p>
                  </div>
                  {!isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleSwitch(m.team.id)}
                      disabled={switchTeam.isPending}
                      style={{
                        padding: "6px 14px", borderRadius: 7,
                        border: `1px solid ${theme.blueBorder}`,
                        background: theme.surface, color: theme.blue,
                        fontSize: 12, fontWeight: 600, fontFamily: F,
                        cursor: switchTeam.isPending ? "wait" : "pointer",
                      }}
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="Team profile" sub="Your team's display name. Library items and shared content live under this team." theme={theme}>
        {myTeam?.isLoading ? (
          <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, padding: "8px 0" }}>Loading…</p>
        ) : (
          <form onSubmit={handleTeamSave} style={{ paddingTop: 4 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F, marginBottom: 6 }}>Team name</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                disabled={updateMyTeam.isPending}
                placeholder="e.g. Acme Solutions"
                style={{
                  flex: 1, padding: "9px 13px",
                  border: `1.5px solid ${theme.borderInput}`, borderRadius: 9,
                  fontFamily: F, fontSize: 14, color: theme.text,
                  background: theme.inputBg,
                  outline: "none", boxSizing: "border-box",
                  cursor: "text",
                }}
              />
              <Btn
                type="submit"
                pending={updateMyTeam.isPending}
                label="Save"
                pendingLabel="Saving…"
                theme={theme}
              />
            </div>
            {teamMsg && <Alert type={teamMsg.type} message={teamMsg.message} />}
          </form>
        )}
      </Card>

      <Card title="Report logo" sub="Used on PDF exports and shared report links. Replaces the Patternly logo. PNG, JPEG, or WebP, up to 2 MB." theme={theme}>
        <div style={{ paddingTop: 4, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 140, height: 64, borderRadius: 9,
            border: `1.5px dashed ${theme.borderInput}`,
            background: theme.inputBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
          }}>
            {currentLogoUrl ? (
              <img
                src={currentLogoUrl}
                alt="Team logo"
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
              />
            ) : (
              <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F }}>No logo</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleLogoPick}
              style={{ display: "none" }}
            />
            <Btn
              onClick={() => logoInputRef.current?.click()}
              disabled={updateMyTeam.isPending}
              pending={updateMyTeam.isPending}
              label={currentLogoUrl ? "Replace logo" : "Upload logo"}
              pendingLabel="Uploading…"
              theme={theme}
            />
            {currentLogoUrl && (
              <button
                type="button"
                onClick={handleLogoRemove}
                disabled={updateMyTeam.isPending}
                style={{
                  padding: "9px 16px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 9,
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: F,
                  cursor: updateMyTeam.isPending ? "not-allowed" : "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        {logoMsg && <Alert type={logoMsg.type} message={logoMsg.message} />}
      </Card>

      <Card title="Invite a user" sub="Generate a one-time invite link. It expires after 2 days." theme={theme}>
        <div style={{ paddingTop: 4 }}>
          <Btn onClick={handleCreateInvite} disabled={createInvite.isPending} pending={createInvite.isPending} label="Generate invite link" pendingLabel="Generating…" theme={theme} />
          {createInvite.isError && <Alert type="error" message="Failed to generate invite link. Please try again." />}
          {inviteLink && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  readOnly value={inviteLink}
                  style={{ flex: 1, padding: "9px 13px", border: `1.5px solid ${theme.borderInput}`, borderRadius: 9, fontFamily: F, fontSize: 13, color: theme.textMuted, background: theme.inputBg, outline: "none", boxSizing: "border-box" }}
                />
                <button
                  onClick={handleCopyInvite}
                  style={{ padding: "9px 16px", background: inviteCopied ? "#ECFDF5" : theme.blueLight, border: `1px solid ${inviteCopied ? "#6EE7B7" : theme.blueBorder}`, borderRadius: 9, color: inviteCopied ? "#059669" : theme.blue, fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
                >
                  {inviteCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                Single-use link, expires in 2 days. Share it directly with the person you&apos;re inviting.
              </p>
            </div>
          )}
        </div>
      </Card>

      {isAdmin && (
        <Card title="Team members" sub="Manage roles and access for all users on this team." theme={theme}>
          {adminUsers.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F, padding: "8px 0" }}>Loading…</p>}
          {adminUsers.isError && <p style={{ fontSize: 13, color: "#DC2626", fontFamily: F, padding: "8px 0" }}>Failed to load team members.</p>}
          {adminUsers.data?.results?.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: F }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>Member</th>
                    <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>Role</th>
                    <th style={{ textAlign: "left", padding: "8px 12px 8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>Status</th>
                    <th style={{ textAlign: "left", padding: "8px 0", color: theme.textSec, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.data.results.map((member) => {
                    const isSelf = member.id === user?.id;
                    return (
                      <tr key={member.id}>
                        <td style={{ padding: "10px 12px 10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          <p style={{ margin: 0, fontWeight: 600, color: theme.text }}>{member.full_name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: theme.textFaint }}>{member.email}</p>
                        </td>
                        <td style={{ padding: "10px 12px 10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          {isSelf ? (
                            <span style={{ fontSize: 13, color: theme.textSec }}>{member.role}</span>
                          ) : (
                            <select
                              defaultValue={member.role}
                              disabled={adminUpdateUser.isPending}
                              onChange={(e) => adminUpdateUser.mutate({ id: member.id, role: e.target.value })}
                              style={{ padding: "5px 8px", border: `1px solid ${theme.borderInput}`, borderRadius: 7, fontFamily: F, fontSize: 13, color: theme.text, background: theme.inputBg, cursor: "pointer" }}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px 10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: member.is_active ? "#ECFDF5" : "#F3F4F6", color: member.is_active ? "#059669" : "#6B7280" }}>
                            {member.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 0", borderBottom: `1px solid ${theme.borderSubtle}` }}>
                          {!isSelf && (
                            <button
                              disabled={adminUpdateUser.isPending}
                              onClick={() => adminUpdateUser.mutate({ id: member.id, is_active: !member.is_active })}
                              style={{ padding: "5px 12px", background: member.is_active ? "#FEF2F2" : theme.blueLight, border: `1px solid ${member.is_active ? "#FECACA" : theme.blueBorder}`, borderRadius: 7, color: member.is_active ? "#DC2626" : theme.blue, fontSize: 12, fontWeight: 600, fontFamily: F, cursor: adminUpdateUser.isPending ? "not-allowed" : "pointer" }}
                            >
                              {member.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

// ── Data tab ─────────────────────────────────────────────────────────────────

function SelectFilter({ value, onChange, options, placeholder, theme }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "7px 12px", border: `1.5px solid ${theme.borderInput}`, borderRadius: 8,
        fontFamily: F, fontSize: 13, color: theme.text, background: theme.inputBg,
        cursor: "pointer", minWidth: 140,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Badge({ label, color, bg, theme }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: bg, color, marginRight: 4, marginBottom: 4,
    }}>
      {label}
    </span>
  );
}

function DataTab({ theme }) {
  const [subTab, setSubTab] = useState("knowledge");
  const [knowledgeFilters, setKnowledgeFilters] = useState({ platform: "", category: "", knowledge_type: "" });
  const [insightFilters, setInsightFilters] = useState({ platform: "", type: "" });
  const [expandedId, setExpandedId] = useState(null);

  const platforms = usePlatforms();
  const knowledge = usePlatformKnowledge(knowledgeFilters);
  const insights = useCommunityInsights(insightFilters);
  const trainingCases = useTrainingCaseFiles();

  const platformOptions = (platforms.data || []).map(p => ({ value: p.slug, label: p.name }));

  const knowledgeTypeOptions = [
    { value: "capability", label: "Capability" },
    { value: "limitation", label: "Limitation" },
    { value: "pricing_constraint", label: "Pricing Constraint" },
    { value: "api_detail", label: "API Detail" },
    { value: "integration_spec", label: "Integration Spec" },
    { value: "feature", label: "Feature" },
  ];

  const categoryOptions = [
    { value: "automations", label: "Automations" },
    { value: "integrations", label: "Integrations" },
    { value: "permissions", label: "Permissions" },
    { value: "hierarchy", label: "Hierarchy / Structure" },
    { value: "reporting", label: "Reporting / Dashboards" },
    { value: "views", label: "Views" },
    { value: "custom_fields", label: "Custom Fields" },
    { value: "templates", label: "Templates" },
    { value: "api", label: "API" },
    { value: "pricing", label: "Pricing / Plans" },
    { value: "other", label: "Other" },
  ];

  const insightTypeOptions = [
    { value: "methodology", label: "Methodology" },
    { value: "workaround", label: "Workaround" },
    { value: "complaint", label: "Complaint / Pain Point" },
    { value: "best_practice", label: "Best Practice" },
    { value: "feature_request", label: "Feature Request" },
    { value: "gotcha", label: "Gotcha / Pitfall" },
  ];

  const subTabs = [
    { id: "knowledge", label: `Platform Knowledge${knowledge.data?.count != null ? ` (${knowledge.data.count})` : ""}` },
    { id: "insights", label: `Community Insights${insights.data?.count != null ? ` (${insights.data.count})` : ""}` },
    { id: "cases", label: `Training Cases${trainingCases.data?.count != null ? ` (${trainingCases.data.count})` : ""}` },
  ];

  return (
    <>
      <Card title="Ingested Data" sub="Browse platform knowledge, community insights, and training case files from ingestion." theme={theme}>
        <TabBar tabs={subTabs} active={subTab} onChange={setSubTab} theme={theme} />

        {/* ── Platform Knowledge ─────────────────────────────── */}
        {subTab === "knowledge" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <SelectFilter value={knowledgeFilters.platform} onChange={v => setKnowledgeFilters(f => ({ ...f, platform: v }))} options={platformOptions} placeholder="All platforms" theme={theme} />
              <SelectFilter value={knowledgeFilters.category} onChange={v => setKnowledgeFilters(f => ({ ...f, category: v }))} options={categoryOptions} placeholder="All categories" theme={theme} />
              <SelectFilter value={knowledgeFilters.knowledge_type} onChange={v => setKnowledgeFilters(f => ({ ...f, knowledge_type: v }))} options={knowledgeTypeOptions} placeholder="All types" theme={theme} />
            </div>
            {knowledge.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>Loading...</p>}
            {knowledge.isError && <p style={{ fontSize: 13, color: "#DC2626", fontFamily: F }}>Failed to load knowledge data.</p>}
            {knowledge.data?.results?.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>No records match the current filters.</p>}
            {knowledge.data?.results?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {knowledge.data.results.map(item => {
                  const isOpen = expandedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setExpandedId(isOpen ? null : item.id)}
                      style={{
                        border: `1px solid ${theme.borderSubtle}`, borderRadius: 8,
                        padding: "12px 14px", cursor: "pointer",
                        background: isOpen ? theme.blueLight : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>{item.title}</p>
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 0 }}>
                            <Badge label={item.platform?.name || "—"} color={theme.blue} bg={theme.blueLight} />
                            {item.knowledge_type && <Badge label={item.knowledge_type.replace(/_/g, " ")} color="#7C3AED" bg="#F3E8FF" />}
                            {item.category && <Badge label={item.category.replace(/_/g, " ")} color="#D97706" bg="#FEF3C7" />}
                          </div>
                        </div>
                        {item.confidence_score != null && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, flexShrink: 0 }}>
                            {Math.round(item.confidence_score * 100)}%
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                          <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{item.content}</p>
                          {item.source_url && (
                            <p style={{ margin: "10px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                              Source: <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: theme.blue }}>{item.source_url}</a>
                            </p>
                          )}
                          {item.source_attribution && (
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Attribution: {item.source_attribution}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Community Insights ─────────────────────────────── */}
        {subTab === "insights" && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <SelectFilter value={insightFilters.platform} onChange={v => setInsightFilters(f => ({ ...f, platform: v }))} options={platformOptions} placeholder="All platforms" theme={theme} />
              <SelectFilter value={insightFilters.type} onChange={v => setInsightFilters(f => ({ ...f, type: v }))} options={insightTypeOptions} placeholder="All types" theme={theme} />
            </div>
            {insights.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>Loading...</p>}
            {insights.isError && <p style={{ fontSize: 13, color: "#DC2626", fontFamily: F }}>Failed to load insights.</p>}
            {insights.data?.results?.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>No insights match the current filters.</p>}
            {insights.data?.results?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insights.data.results.map(item => {
                  const isOpen = expandedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setExpandedId(isOpen ? null : item.id)}
                      style={{
                        border: `1px solid ${theme.borderSubtle}`, borderRadius: 8,
                        padding: "12px 14px", cursor: "pointer",
                        background: isOpen ? theme.blueLight : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>{item.title}</p>
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 0 }}>
                            {item.platforms?.map(p => (
                              <Badge key={p.slug} label={p.name} color={theme.blue} bg={theme.blueLight} />
                            ))}
                            {item.insight_type && <Badge label={item.insight_type.replace(/_/g, " ")} color="#059669" bg="#ECFDF5" />}
                          </div>
                        </div>
                        {item.confidence_score != null && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, flexShrink: 0 }}>
                            {Math.round(item.confidence_score * 100)}%
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                          <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{item.content}</p>
                          {item.source_url && (
                            <p style={{ margin: "10px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                              Source: <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: theme.blue }}>{item.source_url}</a>
                            </p>
                          )}
                          {item.source_attribution && (
                            <p style={{ margin: "4px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Attribution: {item.source_attribution}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Training Case Files ────────────────────────────── */}
        {subTab === "cases" && (
          <>
            {trainingCases.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>Loading...</p>}
            {trainingCases.isError && <p style={{ fontSize: 13, color: "#DC2626", fontFamily: F }}>Failed to load training cases.</p>}
            {trainingCases.data?.results?.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>No training case files yet.</p>}
            {trainingCases.data?.results?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trainingCases.data.results.map(cf => {
                  const isOpen = expandedId === cf.id;
                  return (
                    <div
                      key={cf.id}
                      onClick={() => setExpandedId(isOpen ? null : cf.id)}
                      style={{
                        border: `1px solid ${theme.borderSubtle}`, borderRadius: 8,
                        padding: "12px 14px", cursor: "pointer",
                        background: isOpen ? theme.blueLight : "transparent",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: theme.text, fontFamily: F }}>
                            {cf.name || cf.workflow_type || "Untitled"}
                          </p>
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 0 }}>
                            {cf.primary_platform && <Badge label={cf.primary_platform.name} color={theme.blue} bg={theme.blueLight} />}
                            {cf.workflow_type && <Badge label={cf.workflow_type} color="#7C3AED" bg="#F3E8FF" />}
                            {cf.industries?.map(ind => (
                              <Badge key={ind} label={ind} color="#D97706" bg="#FEF3C7" />
                            ))}
                            <Badge
                              label={cf.built_outcome === "yes" ? "Built" : cf.built_outcome === "partially" ? "Partial" : cf.built_outcome || "—"}
                              color={cf.built_outcome === "yes" ? "#059669" : cf.built_outcome === "partially" ? "#D97706" : "#6B7280"}
                              bg={cf.built_outcome === "yes" ? "#ECFDF5" : cf.built_outcome === "partially" ? "#FEF3C7" : "#F3F4F6"}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          {cf.satisfaction_score != null && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F }}>
                              {cf.satisfaction_score}/5
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                            {cf.source_type === "ingested" ? "Ingested" : cf.source_type}
                          </span>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.borderSubtle}` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 12, fontFamily: F, color: theme.textSec }}>
                            <span>Team size: {cf.team_size || "—"}</span>
                            <span>Roadblocks: {cf.roadblock_count ?? "—"}</span>
                            <span>Tools: {cf.tools?.join(", ") || "—"}</span>
                            <span>Created: {new Date(cf.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { mode, toggle, theme } = useTheme();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();
  const createInvite = useCreateInvite();
  const auditLogs = useAuditLogs();
  const signOutAll = useSignOutAll();
  const adminUsers = useAdminUsers();
  const adminUpdateUser = useAdminUpdateUser();
  const myTeam = useMyTeam();
  const updateMyTeam = useUpdateMyTeam();
  const myTeams = useMyTeams();
  const switchTeam = useSwitchTeam();

  const isAdmin = user?.role === "admin" || user?.is_staff;

  const [activeTab, setActiveTab] = useState("account");

  const [profile, setProfile] = useState({ first_name: user?.first_name || "", last_name: user?.last_name || "" });
  const [profileMsg, setProfileMsg] = useState(null);

  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState(null);

  const [signOutMsg, setSignOutMsg] = useState(null);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      await updateMe.mutateAsync(profile);
      setProfileMsg({ type: "success", message: "Profile updated." });
    } catch {
      setProfileMsg({ type: "error", message: "Failed to update profile. Please try again." });
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (passwords.new_password !== passwords.confirm) {
      setPasswordMsg({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (passwords.new_password.length < 8) {
      setPasswordMsg({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }
    try {
      await changePassword.mutateAsync({ current_password: passwords.current_password, new_password: passwords.new_password });
      setPasswordMsg({ type: "success", message: "Password changed successfully." });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      const msg = err.response?.data?.current_password || err.response?.data?.detail || "Failed to change password.";
      setPasswordMsg({ type: "error", message: msg });
    }
  };

  const handleSignOutAll = async () => {
    setSignOutMsg(null);
    try {
      await signOutAll.mutateAsync();
      setSignOutMsg({ type: "success", message: "Signed out of all devices. Your current session is still active." });
    } catch {
      setSignOutMsg({ type: "error", message: "Failed to sign out of all devices." });
    }
  };

  const handleCreateInvite = async () => {
    try {
      const data = await createInvite.mutateAsync({});
      setInviteLink(`${window.location.origin}/register?token=${data.token}`);
      setInviteCopied(false);
    } catch { /* error handled via createInvite.isError */ }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const tabs = [
    { id: "account",  label: "Account" },
    { id: "security", label: "Security" },
    { id: "team",     label: "Team" },
    { id: "data",     label: "Patterns" },
  ];

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: F, fontWeight: 500, letterSpacing: "-0.025em" }}>Settings</h1>
        <p style={{ margin: 0, fontSize: 14, color: theme.textMuted, fontFamily: F }}>Manage your account and preferences.</p>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} theme={theme} />

      {activeTab === "account" && (
        <AccountTab
          user={user} mode={mode} toggle={toggle} theme={theme}
          updateMe={updateMe} profile={profile} setProfile={setProfile}
          profileMsg={profileMsg} handleProfileSave={handleProfileSave}
        />
      )}

      {activeTab === "security" && (
        <SecurityTab
          user={user} theme={theme}
          changePassword={changePassword} passwords={passwords} setPasswords={setPasswords}
          passwordMsg={passwordMsg} handlePasswordSave={handlePasswordSave}
          signOutAll={signOutAll} signOutMsg={signOutMsg} handleSignOutAll={handleSignOutAll}
          auditLogs={auditLogs}
        />
      )}

      {activeTab === "team" && (
        <TeamTab
          user={user} theme={theme} isAdmin={isAdmin}
          createInvite={createInvite} inviteLink={inviteLink} setInviteLink={setInviteLink}
          inviteCopied={inviteCopied} setInviteCopied={setInviteCopied}
          handleCreateInvite={handleCreateInvite} handleCopyInvite={handleCopyInvite}
          adminUsers={adminUsers} adminUpdateUser={adminUpdateUser}
          myTeam={myTeam} updateMyTeam={updateMyTeam}
          myTeams={myTeams} switchTeam={switchTeam} refreshUser={refreshUser}
        />
      )}

      {activeTab === "data" && (
        <DataTab theme={theme} />
      )}
    </div>
  );
}
