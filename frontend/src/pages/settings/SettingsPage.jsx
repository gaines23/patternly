import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useUpdateMe, useChangePassword } from "../../hooks/useUsers";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

function Card({ title, sub, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 12, padding: "22px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ marginBottom: 18 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: F }}>{title}</p>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9CA3AF", fontFamily: F }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function InputRow({ label, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: F }}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled }) {
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
      style={{ width: "100%", boxSizing: "border-box", padding: "9px 13px", border: `1.5px solid ${f ? BLUE : "#E5E7EB"}`, borderRadius: 9, fontFamily: F, fontSize: 14, color: "#111827", background: disabled ? "#F9FAFB" : "#fff", outline: "none", boxShadow: f ? "0 0 0 3px #EFF6FF" : "none", transition: "all 0.15s" }}
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
  const updateMe = useUpdateMe();
  const changePassword = useChangePassword();

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
        <p style={{ margin: 0, fontSize: 14, color: "#6B7280", fontFamily: F }}>Manage your account and preferences.</p>
      </div>

      {/* Profile */}
      <Card title="Profile" sub="Update your name and display information.">
        <form onSubmit={handleProfileSave}>
          <InputRow label="Email">
            <TextInput value={user?.email || ""} onChange={() => {}} disabled />
          </InputRow>
          <InputRow label="First name">
            <TextInput
              value={profile.first_name}
              onChange={v => setProfile({ ...profile, first_name: v })}
              placeholder="First name"
            />
          </InputRow>
          <InputRow label="Last name">
            <TextInput
              value={profile.last_name}
              onChange={v => setProfile({ ...profile, last_name: v })}
              placeholder="Last name"
            />
          </InputRow>
          <InputRow label="Role">
            <TextInput value={user?.role || ""} onChange={() => {}} disabled />
          </InputRow>
          {profileMsg && <Alert type={profileMsg.type} message={profileMsg.message} />}
          <div style={{ marginTop: 18 }}>
            <button
              type="submit"
              disabled={updateMe.isPending}
              style={{ padding: "9px 22px", background: updateMe.isPending ? "#93C5FD" : BLUE, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: updateMe.isPending ? "not-allowed" : "pointer" }}
            >
              {updateMe.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Card>

      {/* Password */}
      <Card title="Password" sub="Change your account password. Minimum 8 characters.">
        <form onSubmit={handlePasswordSave}>
          <InputRow label="Current password">
            <TextInput
              type="password"
              value={passwords.current_password}
              onChange={v => setPasswords({ ...passwords, current_password: v })}
              placeholder="••••••••"
            />
          </InputRow>
          <InputRow label="New password">
            <TextInput
              type="password"
              value={passwords.new_password}
              onChange={v => setPasswords({ ...passwords, new_password: v })}
              placeholder="Min 8 characters"
            />
          </InputRow>
          <InputRow label="Confirm new">
            <TextInput
              type="password"
              value={passwords.confirm}
              onChange={v => setPasswords({ ...passwords, confirm: v })}
              placeholder="Repeat new password"
            />
          </InputRow>
          {passwordMsg && <Alert type={passwordMsg.type} message={passwordMsg.message} />}
          <div style={{ marginTop: 18 }}>
            <button
              type="submit"
              disabled={changePassword.isPending}
              style={{ padding: "9px 22px", background: changePassword.isPending ? "#93C5FD" : BLUE, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: F, cursor: changePassword.isPending ? "not-allowed" : "pointer" }}
            >
              {changePassword.isPending ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </Card>

      {/* Account info */}
      <Card title="Account" sub="Read-only account details.">
        <InputRow label="Account ID">
          <TextInput value={user?.id || ""} onChange={() => {}} disabled />
        </InputRow>
        <InputRow label="Member since">
          <TextInput
            value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
            onChange={() => {}}
            disabled
          />
        </InputRow>
      </Card>
    </div>
  );
}
