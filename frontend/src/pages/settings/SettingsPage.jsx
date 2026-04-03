import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useUpdateMe, useChangePassword, useCreateInvite } from "../../hooks/useUsers";

const F = "'Plus Jakarta Sans', sans-serif";

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
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 13px",
        border: `1.5px solid ${f ? theme.blue : theme.borderInput}`,
        borderRadius: 9,
        fontFamily: F,
        fontSize: 14,
        color: theme.text,
        background: disabled ? theme.inputBgDisabled : theme.inputBg,
        outline: "none",
        boxShadow: f ? `0 0 0 3px ${theme.blueLight}` : "none",
        transition: "all 0.15s",
      }}
    />
  );
}

function Alert({ type, message }) {
  const styles = {
    success: { bg: "#ECFDF5", border: "#6EE7B7", color: "#059669" },
    error: { bg: "#FEF2F2", border: "#FECACA", color: "#DC2626" },
  };
  const s = styles[type] || styles.error;
  return (
    <div style={{ padding: "11px 14px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, marginTop: 16, fontSize: 13, color: s.color, fontFamily: F }}>
      {message}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { mode, toggle, theme } = useTheme();
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();
  const createInvite = useCreateInvite();

  const [inviteLink, setInviteLink] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const handleCreateInvite = async () => {
    try {
      const data = await createInvite.mutateAsync({});
      const link = `${window.location.origin}/register?token=${data.token}`;
      setInviteLink(link);
      setInviteCopied(false);
    } catch {
      // error handled via createInvite.isError
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  // Profile form
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
  });
  const [profileMsg, setProfileMsg] = useState(null);

  // Password form
  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [passwordMsg, setPasswordMsg] = useState(null);

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
      await changePassword.mutateAsync({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswordMsg({ type: "success", message: "Password changed successfully." });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      const msg = err.response?.data?.current_password || err.response?.data?.detail || "Failed to change password.";
      setPasswordMsg({ type: "error", message: msg });
    }
  };

  return (
    <div style={{ padding: "32px 32px 80px", maxWidth: 680 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>Settings</h1>
        <p style={{ margin: 0, fontSize: 14, color: theme.textMuted, fontFamily: F }}>Manage your account and preferences.</p>
      </div>

      {/* Appearance */}
      <Card title="Appearance" sub="Choose how Flowpath looks on your device." theme={theme}>
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              background: theme.blueLight,
              border: `1px solid ${theme.blueBorder}`,
              borderRadius: 9,
              color: theme.blue,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: F,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: 15 }}>{mode === "dark" ? "☀" : "☽"}</span>
            {mode === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </Card>

      {/* Profile */}
      <Card title="Profile" sub="Update your name and display information." theme={theme}>
        <form onSubmit={handleProfileSave}>
          <InputRow label="Email" theme={theme}>
            <TextInput value={user?.email || ""} onChange={() => {}} disabled theme={theme} />
          </InputRow>
          <InputRow label="First name" theme={theme}>
            <TextInput
              value={profile.first_name}
              onChange={v => setProfile({ ...profile, first_name: v })}
              placeholder="First name"
              theme={theme}
            />
          </InputRow>
          <InputRow label="Last name" theme={theme}>
            <TextInput
              value={profile.last_name}
              onChange={v => setProfile({ ...profile, last_name: v })}
              placeholder="Last name"
              theme={theme}
            />
          </InputRow>
          <InputRow label="Role" theme={theme}>
            <TextInput value={user?.role || ""} onChange={() => {}} disabled theme={theme} />
          </InputRow>
          {profileMsg && <Alert type={profileMsg.type} message={profileMsg.message} />}
          <div style={{ marginTop: 18 }}>
            <button
              type="submit"
              disabled={updateMe.isPending}
              style={{ padding: "9px 22px", background: updateMe.isPending ? theme.blueSubtle : theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: updateMe.isPending ? "not-allowed" : "pointer" }}
            >
              {updateMe.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>

      {/* Password */}
      <Card title="Password" sub="Change your account password. Minimum 8 characters." theme={theme}>
        <form onSubmit={handlePasswordSave}>
          <InputRow label="Current password" theme={theme}>
            <TextInput
              type="password"
              value={passwords.current_password}
              onChange={v => setPasswords({ ...passwords, current_password: v })}
              placeholder="••••••••"
              theme={theme}
            />
          </InputRow>
          <InputRow label="New password" theme={theme}>
            <TextInput
              type="password"
              value={passwords.new_password}
              onChange={v => setPasswords({ ...passwords, new_password: v })}
              placeholder="Min 8 characters"
              theme={theme}
            />
          </InputRow>
          <InputRow label="Confirm new" theme={theme}>
            <TextInput
              type="password"
              value={passwords.confirm}
              onChange={v => setPasswords({ ...passwords, confirm: v })}
              placeholder="Repeat new password"
              theme={theme}
            />
          </InputRow>
          {passwordMsg && <Alert type={passwordMsg.type} message={passwordMsg.message} />}
          <div style={{ marginTop: 18 }}>
            <button
              type="submit"
              disabled={changePassword.isPending}
              style={{ padding: "9px 22px", background: changePassword.isPending ? theme.blueSubtle : theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: changePassword.isPending ? "not-allowed" : "pointer" }}
            >
              {changePassword.isPending ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </Card>

      {/* Invite */}
      <Card title="Invite a user" sub="Generate a one-time invite link. It expires after 2 days." theme={theme}>
        <div style={{ paddingTop: 4 }}>
          <button
            onClick={handleCreateInvite}
            disabled={createInvite.isPending}
            style={{ padding: "9px 22px", background: createInvite.isPending ? theme.blueSubtle : theme.blue, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: createInvite.isPending ? "not-allowed" : "pointer" }}
          >
            {createInvite.isPending ? "Generating…" : "Generate invite link"}
          </button>

          {createInvite.isError && (
            <Alert type="error" message="Failed to generate invite link. Please try again." />
          )}

          {inviteLink && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  readOnly
                  value={inviteLink}
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
                This link is single-use and expires in 2 days. Share it directly with the person you&apos;re inviting.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Account info */}
      <Card title="Account" sub="Read-only account details." theme={theme}>
        <InputRow label="Account ID" theme={theme}>
          <TextInput value={user?.id || ""} onChange={() => {}} disabled theme={theme} />
        </InputRow>
        <InputRow label="Member since" theme={theme}>
          <TextInput
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
            onChange={() => {}}
            disabled
            theme={theme}
          />
        </InputRow>
      </Card>
    </div>
  );
}
