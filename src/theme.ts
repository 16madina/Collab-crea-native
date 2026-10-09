export const colors = {
  bg: "#FBF4EF",
  bgDeep: "#F6E7DE",
  surface: "#FFFFFF",
  ink: "#141414",
  inkSoft: "#4A4440",
  muted: "#8C837D",
  line: "#EFE3DB",
  primary: "#FF5A36",
  primaryDark: "#E8431F",
  primarySoft: "#FFE3DA",
  night: "#121212",
  nightSoft: "#1E1E1E",
  glass: "rgba(255,255,255,0.55)",
  glassBorder: "rgba(255,255,255,0.8)",
  success: "#1FA463",
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const space = (n: number) => n * 4;

export const shadow = {
  soft: {
    shadowColor: "#7A3A20",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: "800" as const, letterSpacing: -1.2, color: colors.ink },
  h1: { fontSize: 26, lineHeight: 31, fontWeight: "800" as const, letterSpacing: -0.6, color: colors.ink },
  h2: { fontSize: 20, lineHeight: 25, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 16, lineHeight: 21, fontWeight: "700" as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" as const, color: colors.inkSoft },
  small: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const, color: colors.muted },
  tiny: { fontSize: 11, lineHeight: 14, fontWeight: "600" as const, color: colors.muted },
};
