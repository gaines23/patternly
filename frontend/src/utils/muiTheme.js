import { createTheme } from "@mui/material/styles";
import { themes } from "./theme";

/**
 * Build a MUI theme that mirrors Flowpath's existing design tokens.
 * Pass the current mode ("light" | "dark") from useTheme() so MUI stays
 * in sync with the existing data-theme toggle.
 */
export function createMuiTheme(mode = "light") {
  const t = themes[mode] || themes.light;

  return createTheme({
    palette: {
      mode,
      primary: {
        main:        t.blue,
        light:       t.blueLight,
        contrastText: "#ffffff",
      },
      background: {
        default: t.bg,
        paper:   t.surface,
      },
      text: {
        primary:   t.text,
        secondary: t.textMuted,
        disabled:  t.textFaint,
      },
      divider: t.border,
      error: {
        main: "#DC2626",
        light: "#FEF2F2",
      },
      success: {
        main: "#16A34A",
        light: "#F0FDF4",
      },
      warning: {
        main: "#EA580C",
        light: "#FFF7ED",
      },
    },

    typography: {
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: 14,
      h1: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em" },
      h2: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em" },
      h4: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em" },
      h5: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em" },
      h6: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 700, letterSpacing: "-0.02em" },
      button: {
        textTransform: "none",
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      },
    },

    shape: {
      borderRadius: 10,
    },

    shadows: [
      "none",
      "0 1px 4px rgba(0,0,0,0.06)",  // elevation 1 → card
      "0 2px 12px rgba(0,0,0,0.08)", // elevation 2 → auth card / modal
      "0 4px 24px rgba(0,0,0,0.10)", // elevation 3 → dropdown
      ...Array(21).fill("none"),      // 4–24 unused, keep array length = 25
    ],

    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: "9px 18px",
            fontSize: 14,
          },
          containedPrimary: {
            background: t.blue,
            "&:hover": { background: mode === "dark" ? "#3B82F6" : "#1D4ED8" },
          },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            background: t.inputBg,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: t.borderInput,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: t.blue,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: t.blue,
              boxShadow: `0 0 0 3px ${t.blueLight}`,
            },
          },
        },
      },

      MuiCard: {
        defaultProps: {
          elevation: 1,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.surface,
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none", // MUI adds a subtle gradient in dark mode — disable it
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            fontSize: 12,
          },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            background: t.tooltipBg,
            color: t.tooltipText,
            fontSize: 12,
            borderRadius: 8,
          },
        },
      },
    },
  });
}
