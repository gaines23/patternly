/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  // Sync dark mode with the existing data-theme="dark" attribute on <html>
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      // Mirror Flowpath design tokens so Tailwind classes stay in sync
      colors: {
        fp: {
          blue:         "#2563EB",
          "blue-light": "#EFF6FF",
          "blue-border":"#BFDBFE",
          "blue-subtle":"#93C5FD",
          bg:           "#F9FAFB",
          surface:      "#FFFFFF",
          border:       "#F0F0F0",
          "border-input":"#E5E7EB",
          text:         "#111827",
          "text-sec":   "#374151",
          "text-muted": "#6B7280",
          "text-faint": "#9CA3AF",
        },
      },
      fontFamily: {
        sans:    ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "Georgia", "serif"],
      },
      borderRadius: {
        card: "12px",
        input: "10px",
        pill: "999px",
      },
      boxShadow: {
        card:     "0 1px 4px rgba(0,0,0,0.06)",
        "card-lg":"0 2px 12px rgba(0,0,0,0.08)",
        focus:    "0 0 0 3px #EFF6FF",
      },
    },
  },
  plugins: [],
};
