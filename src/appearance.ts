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
    bgGrad: ["#0B0B0B", "#0B0B0B"] as readonly [string, string],
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
    bg: "#F6E7DE",
    bgGrad: ["#FBF1EB", "#F3DDD1"] as readonly [string, string],
    ink: "#2B1A13",
    inkSoft: "#6B4F43",
    muted: "#9C7F72",
    primary: "#B26F55",
    onPrimary: "#2B1A13",
    card: "#FBF2EC",
    cardFade: "rgba(251,242,236,",
    border: "rgba(178,111,85,0.22)",
    borderStrong: "rgba(255,255,255,0.9)",
    tagBg: "rgba(236,214,201,0.75)",
    tagBorder: "rgba(178,111,85,0.15)",
    heartBg: "rgba(255,255,255,0.35)",
    heartBorder: "rgba(255,255,255,0.8)",
    heartIcon: "#FFFFFF",
    mono: "#EFD9CC",
    monoText: "#B26F55",
    ringBg: "rgba(255,255,255,0.45)",
    ambient: "rgba(255,255,255,",
    shadow: "#9A5D45",
    shadowOpacity: 0.18,
    title: "#2B1A13",
  },
};
export type Pal = (typeof PAL)["dark"];
