// Identité Noir & Champagne.
export const colors = {
  bg: "#0B0B0B",
  bgDeep: "#111111",
  surface: "#181818",
  surfaceHi: "#202020",
  ink: "#F8F6F2",
  inkSoft: "#D6D2CB",
  muted: "#A8A8A8",
  line: "#35302A",
  primary: "#D8AD6A",
  primaryDark: "#B8904F",
  primaryLight: "#F3D49B",
  primaryPale: "#F8EBD4",
  primarySoft: "rgba(216,173,106,0.14)",
  onPrimary: "#0B0B0B",
  night: "#141414",
  nightSoft: "#1E1E1E",
  glass: "rgba(24,24,24,0.72)",
  glassBorder: "rgba(255,255,255,0.08)",
  success: "#4CC38A",
  successSoft: "rgba(76,195,138,0.14)",
  warning: "#E8B65A",
  warningSoft: "rgba(232,182,90,0.14)",
  danger: "#F07167",
  dangerSoft: "rgba(240,113,103,0.14)",
};

export const fonts = {
  serif: "PlayfairDisplay_700Bold",
  serifItalic: "PlayfairDisplay_700Bold_Italic",
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const space = (n: number) => n * 4;

export const shadow = {
  soft: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const type = {
  display: { fontSize: 40, lineHeight: 46, fontFamily: fonts.serif, letterSpacing: -0.5, color: colors.ink },
  h1: { fontSize: 26, lineHeight: 32, fontFamily: fonts.serif, letterSpacing: -0.2, color: colors.ink },
  h2: { fontSize: 20, lineHeight: 25, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 16, lineHeight: 21, fontWeight: "700" as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const, color: colors.inkSoft },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const, color: colors.muted },
  tiny: { fontSize: 11, lineHeight: 14, fontWeight: "600" as const, color: colors.muted },
};
