// Apparence de l'accueil : « Noir & Champagne » (sombre) ou « Champagne rosé » (clair).
// Le choix est mémorisé sur l'appareil ; les composants lux lisent le ton via ToneContext.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { colors } from "./theme";

export type Tone = "dark" | "light";

export const useAppearance = create<{ home: Tone; toggleHome: () => void }>()(
  persist(
    (set) => ({
      home: "dark",
      toggleHome: () =>
        set((s) => ({ home: s.home === "dark" ? "light" : "dark" })),
    }),
    { name: "cc-appearance", storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const ToneContext = createContext<Tone>("dark");
export const useTone = () => useContext(ToneContext);

export const PAL = {
  dark: {
    ...colors,
    bgGrad: ["#0B0B0B", "#0B0B0B"] as readonly [string, string, ...string[]],
    card: "#0E0E0E",
    cardFade: "rgba(14,14,14,",
    border: "rgba(217,172,101,0.28)",
    borderStrong: "rgba(245,211,148,0.55)",
    tagBg: "rgba(40,40,40,0.85)",
    tagBorder: "rgba(255,255,255,0.08)",
    heartBg: "rgba(11,11,11,0.45)",
    heartBorder: "rgba(248,246,242,0.25)",
    heartIcon: "#F8F6F2",
    mono: "#141210",
    monoText: "#D9AC65",
    ringBg: "rgba(255,255,255,0.03)",
    ambient: "rgba(217,172,101,",
    shadow: "#000",
    shadowOpacity: 0.55,
    title: "#F8F6F2",
  },
  light: {
    ...colors,
    // Palette officielle « Champagne Rosé Premium »
    bg: "#FFF8F3",
    bgGrad: ["#FFF9F5", "#F7E6DB", "#EECBBB"] as readonly [string, string, ...string[]],
    ink: "#30201C",
    inkSoft: "#735E55",
    muted: "#9A857B",
    primary: "#A65F46",
    onPrimary: "#30201C",
    card: "#FFF9F5",
    cardFade: "rgba(255,249,245,",
    border: "rgba(199,137,112,0.22)",
    borderStrong: "rgba(255,255,255,0.85)",
    tagBg: "rgba(246,228,217,0.9)",
    tagBorder: "rgba(199,137,112,0.16)",
    heartBg: "rgba(48,32,28,0.18)",
    heartBorder: "rgba(255,255,255,0.75)",
    heartIcon: "#FFFFFF",
    mono: "#F6E4D9",
    monoText: "#C78970",
    ringBg: "rgba(255,249,245,0.7)",
    ambient: "rgba(255,228,205,",
    shadow: "#A65F46",
    shadowOpacity: 0.13,
    title: "#30201C",
  },
};
export const BG_LOCATIONS = { dark: [0, 1], light: [0, 0.48, 1] } as const;
export type Pal = (typeof PAL)["dark"];
