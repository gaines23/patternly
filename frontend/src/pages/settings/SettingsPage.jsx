import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import {
  useUpdateMe, useChangePassword, useCreateInvite,
  useAuditLogs, useSignOutAll, useAdminUsers, useAdminUpdateUser,
} from "../../hooks/useUsers";

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

function TeamTab({ user, theme, createInvite, inviteLink, setInviteLink, inviteCopied, setInviteCopied, handleCreateInvite, handleCopyInvite, isAdmin, adminUsers, adminUpdateUser }) {
  return (
    <>
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
        <Card title="Team members" sub="Manage roles and access for all users in your organization." theme={theme}>
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
                              <option value="engineer">Engineer</option>
                              <option value="viewer">Viewer</option>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, toggle, theme } = useTheme();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();
  const createInvite = useCreateInvite();
  const auditLogs = useAuditLogs();
  const signOutAll = useSignOutAll();
  const adminUsers = useAdminUsers();
  const adminUpdateUser = useAdminUpdateUser();

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
  ];

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>Settings</h1>
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
        />
      )}
    </div>
  );
}
