import { useTheme } from "@hooks/useTheme";
import { PatternlyWordmark } from "@components/brand/PatternlyMark";
import Card from "./Card";

/**
 * Centered full-viewport auth page shell.
 *
 * Replaces the identical layout shell duplicated in:
 *   LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage
 *
 * Usage:
 *   <AuthLayout title="Sign in" subtitle="Log in to access the case file builder.">
 *     <form>...</form>
 *   </AuthLayout>
 */
export default function AuthLayout({ title, subtitle, children }) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        minHeight:      "100vh",
        background:     theme.bg,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo lockup */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <PatternlyWordmark />
        </div>

        {/* Content card */}
        <Card variant="elevated" radius="14px" padding="32px 28px">
          {title && (
            <h1
              style={{
                margin:     "0 0 6px",
                fontSize:   22,
                fontFamily: "'Fraunces', Georgia, serif",
                color:      theme.text,
              }}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              style={{
                margin:     "0 0 24px",
                fontSize:   13,
                color:      theme.textMuted,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              {subtitle}
            </p>
          )}
          {children}
        </Card>
      </div>
    </div>
  );
}
