import { useTheme } from "@hooks/useTheme";

/**
 * The Flowpath icon mark (square with circles + arc).
 * Replaces the four identical inline SVG definitions in:
 *   LoginPage, ForgotPasswordPage, ResetPasswordPage, AppLayout
 */
export function FlowpathMark({ size = 44, blue }) {
  const { theme } = useTheme();
  const color = blue ?? theme.blue;
  const px = typeof size === "number" ? size : parseInt(size);

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill={color} />
      <circle cx="9"  cy="20" r="4.5" fill="white" />
      <circle cx="18" cy="13" r="3"   fill="white" fillOpacity="0.55" />
      <circle cx="27" cy="20" r="4.5" fill="white" />
      <circle cx="27" cy="20" r="1.8" fill={color} />
      <path
        d="M13 17.5 Q18 9 23 17.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * Full logo lockup: icon + "flowpath" wordmark + optional tagline.
 * Use in auth pages and any marketing/onboarding surfaces.
 */
export function FlowpathWordmark({ tagline = "Workflow Intelligence", size = 44 }) {
  const { theme } = useTheme();

  return (
    <div className="inline-flex flex-col items-center gap-2 select-none">
      <FlowpathMark size={size} />
      <div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: theme.text,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: "-0.04em",
          }}
        >
          flow
        </span>
        <span
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: theme.blue,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: "-0.04em",
          }}
        >
          path
        </span>
      </div>
      {tagline && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: theme.textFaint,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {tagline}
        </p>
      )}
    </div>
  );
}
