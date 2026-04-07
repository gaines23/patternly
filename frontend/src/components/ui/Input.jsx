import { useState } from "react";
import { useTheme } from "@hooks/useTheme";

const F = "'Plus Jakarta Sans', sans-serif";

/**
 * Themed text input / textarea with built-in focus ring.
 *
 * Replaces the `inputStyle` + onFocus/onBlur pattern repeated across:
 *   LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage,
 *   CaseFileListPage (search), SettingsPage TextInput
 *
 * @param {"input"|"textarea"} as_   renders as input or textarea
 * @param {string}             label optional label above input
 * @param {string}             error error message (shows red border + message)
 * @param {string}             helper subtle help text below input
 */
export default function Input({
  as: as_ = "input",
  label,
  type = "text",
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  error,
  helper,
  disabled = false,
  required = false,
  autoComplete,
  rows = 4,
  name,
  id,
  className = "",
  style = {},
  inputStyle = {},
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const inputId = id || name;

  const baseInputStyle = {
    width: "100%",
    padding: "11px 14px",
    border: `1.5px solid ${error ? "#FECACA" : focused ? theme.blue : theme.borderInput}`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: F,
    color: theme.text,
    background: disabled ? theme.inputBgDisabled : theme.inputBg,
    outline: "none",
    boxSizing: "border-box",
    resize: as_ === "textarea" ? "vertical" : undefined,
    boxShadow: focused ? `0 0 0 3px ${error ? "#FEE2E2" : theme.blueLight}` : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    cursor: disabled ? "not-allowed" : undefined,
    opacity: disabled ? 0.7 : 1,
    ...inputStyle,
  };

  const Tag = as_;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.text,
            fontFamily: F,
          }}
        >
          {label}
          {required && <span style={{ color: "#DC2626", marginLeft: 2 }}>*</span>}
        </label>
      )}

      <Tag
        id={inputId}
        name={name}
        type={as_ === "textarea" ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        rows={as_ === "textarea" ? rows : undefined}
        style={baseInputStyle}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      />

      {error && (
        <span style={{ fontSize: 12, color: "#DC2626", fontFamily: F }}>{error}</span>
      )}
      {!error && helper && (
        <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: F }}>{helper}</span>
      )}
    </div>
  );
}
