import { useTheme } from "@hooks/useTheme";

/**
 * The Patternly icon mark (geometric P with waypoint dots on indigo square).
 */
export function PatternlyMark({ size = 44 }) {
  const px = typeof size === "number" ? size : parseInt(size);

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Patternly mark"
    >
      <rect x="3" y="3" width="38" height="38" rx="8" fill="#1E1B3A" />

      <circle cx="8" cy="10" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="37" cy="10" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="8" cy="22" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="38" cy="26" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="23" cy="37" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="35" cy="36" r="1.2" fill="#B8B0D9" opacity="0.3" />
      <circle cx="7" cy="34" r="1.2" fill="#B8B0D9" opacity="0.3" />

      <line x1="15" y1="35" x2="15" y2="22" stroke="#9B93E8" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M 15 22 L 25 22 A 6.5 6.5 0 0 0 25 9 L 15 9"
        stroke="#9B93E8"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle cx="15" cy="35" r="2.8" fill="#F5D76E" />
      <circle cx="15" cy="22" r="2.8" fill="#F5D76E" />
      <circle cx="15" cy="9" r="2.8" fill="#F5D76E" />
      <circle cx="25" cy="9" r="2.8" fill="#F5D76E" />
      <circle cx="31.5" cy="15.5" r="2.8" fill="#F5D76E" />
      <circle cx="25" cy="22" r="2.8" fill="#F5D76E" />
    </svg>
  );
}

/**
 * Full logo lockup: icon + "Patternly" wordmark + optional tagline.
 * Use in auth pages and any marketing/onboarding surfaces.
 */
export function PatternlyWordmark({ tagline = "Spot the pattern. Skip the meeting", size = 44 }) {
  const { theme } = useTheme();

  return (
    <div className="inline-flex flex-col items-center gap-2 select-none">
      <PatternlyMark size={size} />
      <span
        style={{
          fontSize: 28,
          fontWeight: 500,
          color: theme.text,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: "-0.03em",
        }}
      >
        Patternly
      </span>
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

// Backward-compatible aliases
export const FlowpathMark = PatternlyMark;
export const FlowpathWordmark = PatternlyWordmark;
