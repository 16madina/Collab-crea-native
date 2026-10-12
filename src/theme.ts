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
  display: { fontSize: 35, lineHeight: 40, fontFamily: fonts.serif, letterSpacing: -0.5, color: colors.ink },
  h1: { fontSize: 23, lineHeight: 28, fontFamily: fonts.serif, letterSpacing: -0.2, color: colors.ink },
  h2: { fontSize: 18, lineHeight: 22, fontWeight: "700" as const, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 14, lineHeight: 18, fontWeight: "700" as const, color: colors.ink },
  body: { fontSize: 13, lineHeight: 19, fontWeight: "400" as const, color: colors.inkSoft },
  small: { fontSize: 11, lineHeight: 16, fontWeight: "500" as const, color: colors.muted },
  tiny: { fontSize: 10, lineHeight: 12, fontWeight: "600" as const, color: colors.muted },
};

// ── Mode clair « Champagne Rosé Premium » ──────────────────────────────
// Le ton est appliqué au démarrage (src/Boot.tsx), AVANT le chargement des écrans :
// les StyleSheet créés ensuite lisent donc directement les bonnes couleurs.
export type Tone = "dark" | "light";
export const DARK_COLORS = { ...colors };
export const LIGHT_COLORS: typeof colors = {
  bg: "#FFF8F3",
  bgDeep: "#F6E4D9",
  surface: "#FFF9F5",
  surfaceHi: "#F6E4D9",
  ink: "#30201C",
  inkSoft: "#735E55",
  muted: "#9A857B",
  line: "#EBD3C6",
  primary: "#A65F46",
  primaryDark: "#8C4D37",
  primaryLight: "#DDA88F",
  primaryPale: "#F6E4D9",
  primarySoft: "rgba(199,137,112,0.14)",
  onPrimary: "#FFFFFF",
  night: "#FFF9F5",
  nightSoft: "#F6E4D9",
  glass: "rgba(255,249,245,0.82)",
  glassBorder: "rgba(199,137,112,0.18)",
  success: "#2F9E6B",
  successSoft: "rgba(47,158,107,0.12)",
  warning: "#B7791F",
  warningSoft: "rgba(183,121,31,0.12)",
  danger: "#C53030",
  dangerSoft: "rgba(197,48,48,0.10)",
};
let TONE: Tone = "dark";
export const getTone = () => TONE;
export const isLight = () => TONE === "light";
/** Remplace les couleurs partagées (à appeler une seule fois, au démarrage). */
export function applyTone(t: Tone) {
  TONE = t;
  const src = t === "light" ? LIGHT_COLORS : DARK_COLORS;
  Object.assign(colors, src);
  shadow.glow.shadowColor = colors.primary;
  shadow.soft.shadowColor = t === "light" ? "#A65F46" : "#000";
  shadow.soft.shadowOpacity = t === "light" ? 0.14 : 0.35;
  for (const v of Object.values(type) as { color?: string }[]) {
    if (v.color === DARK_COLORS.ink || v.color === LIGHT_COLORS.ink) v.color = colors.ink;
    else if (v.color === DARK_COLORS.inkSoft || v.color === LIGHT_COLORS.inkSoft) v.color = colors.inkSoft;
    else if (v.color === DARK_COLORS.muted || v.color === LIGHT_COLORS.muted) v.color = colors.muted;
    else if (v.color === DARK_COLORS.primary || v.color === LIGHT_COLORS.primary) v.color = colors.primary;
  }
}
