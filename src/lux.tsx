// Styles « Glossy Black & Metallic Champagne Gold » réutilisables.
// Règle : le métal (or) est réservé aux boutons principaux, au logo, aux éléments
// sélectionnés et à quelques accents ; les surfaces restent sobres (noir brillant).
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { PAL, useTone } from "./appearance";
import { colors, radius } from "./theme";
import { Press } from "./ui";

// linear-gradient(135deg, #FFE4AC 0%, #D9AC65 45%, #B98236 75%, #F5D394 100%)
export const GOLD = {
  colors: ["#FFE4AC", "#D9AC65", "#B98236", "#F5D394"] as const,
  locations: [0, 0.45, 0.75, 1] as const,
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

// linear-gradient(145deg, #242424 0%, #111111 48%, #050505 100%)
export const CARD = {
  colors: ["#242424", "#111111", "#050505"] as const,
  locations: [0, 0.48, 1] as const,
  start: { x: 0.2, y: 0 },
  end: { x: 0.8, y: 1 },
};

// Or rosé (mode clair « champagne rosé »).
// linear-gradient(115deg, #FFE8D8 0%, #DDA88F 35%, #B97055 65%, #F5CBB5 100%)
export const ROSE = {
  colors: ["#FFE8D8", "#DDA88F", "#B97055", "#F5CBB5"] as const,
  locations: [0, 0.35, 0.65, 1] as const,
  start: { x: 0, y: 0.3 },
  end: { x: 1, y: 0.7 },
};
// linear-gradient(145deg, #FFF9F5 0%, #F5DDD0 55%, #E8BBA8 100%)
export const CARD_LIGHT = {
  colors: ["#FFF9F5", "#F5DDD0", "#E8BBA8"] as const,
  locations: [0, 0.55, 1] as const,
  start: { x: 0.2, y: 0 },
  end: { x: 0.8, y: 1 },
};

export const goldBorder = "rgba(217,172,101,0.28)";
export const goldBorderStrong = "rgba(245,211,148,0.55)";

export const luxShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.55,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 10,
};
export const roseGlow = {
  shadowColor: "#A65F46",
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
export const goldGlow = {
  shadowColor: "#D9AC65",
  shadowOpacity: 0.35,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
};

/** Remplissage or métallique avec reflet supérieur (à placer en absoluteFill). */
export function GoldFill({ style }: { style?: StyleProp<ViewStyle> }) {
  const tone = useTone();
  return (
    <View
      style={[StyleSheet.absoluteFill, { overflow: "hidden" }, style]}
      pointerEvents="none"
    >
      <LinearGradient
        {...(tone === "light" ? ROSE : GOLD)}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={tone === "light" ? ["rgba(255,248,240,0.35)", "rgba(255,255,255,0)"] : ["rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]}
        locations={[0, 0.55]}
        style={styles.sheenTop}
      />
    </View>
  );
}

/** Fond de carte noir brillant + liseré lumineux en haut. */
export function GlossFill({ style }: { style?: StyleProp<ViewStyle> }) {
  const tone = useTone();
  if (tone === "light")
    return (
      <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
        <LinearGradient {...CARD_LIGHT} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
          locations={[0, 0.45]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient {...CARD} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0)"]}
        locations={[0, 0.35]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(255,236,200,0.22)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.hairline}
      />
    </View>
  );
}

/** Carte sombre brillante à bordure dorée discrète. */
export function GlossCard({
  children,
  style,
  gold,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  gold?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        { borderColor: gold ? goldBorderStrong : goldBorder },
        luxShadow,
        style,
      ]}
    >
      <GlossFill />
      {children}
    </View>
  );
}

/** Bouton principal or métallique, texte noir. */
export function GoldButton({
  label,
  onPress,
  icon = "arrow-forward",
  size = "md",
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap | null;
  size?: "xs" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}) {
  const h = size === "xs" ? 26 : size === "sm" ? 32 : size === "lg" ? 54 : 42;
  const fs = size === "xs" ? 10 : size === "sm" ? 11 : size === "lg" ? 15 : 13;
  const tone = useTone();
  const on = PAL[tone].onPrimary;
  return (
    <Press
      onPress={onPress}
      style={[
        styles.btn,
        {
          height: h,
          paddingHorizontal: size === "xs" ? 10 : size === "sm" ? 12 : 20,
        },
        tone === "light" ? roseGlow : goldGlow,
        style,
      ]}
      scaleTo={0.95}
    >
      <GoldFill style={{ borderRadius: radius.pill }} />
      <Text style={[styles.btnText, { fontSize: fs, color: on }]}>{label}</Text>
      {icon ? <Ionicons name={icon} size={fs + 2} color={on} /> : null}
    </Press>
  );
}

/** Pastille de filtre : sélectionnée = or métallique, sinon contour discret. */
export function GoldPill({
  label,
  on,
  onPress,
  icon,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = PAL[useTone()];
  return (
    <Press
      onPress={onPress}
      style={[
        styles.pill,
        { borderColor: t.border },
        on ? [{ borderColor: "transparent" }, goldGlow] : null,
      ]}
      scaleTo={0.94}
    >
      {on && <GoldFill style={{ borderRadius: radius.pill }} />}
      {icon && (
        <Ionicons name={icon} size={14} color={on ? t.onPrimary : t.inkSoft} />
      )}
      <Text
        style={{
          fontSize: 11,
          fontWeight: on ? "700" : "600",
          color: on ? t.onPrimary : t.ink,
        }}
      >
        {label}
      </Text>
    </Press>
  );
}

/** Anneau or autour d'un avatar. */
export function GoldRing({
  size,
  children,
}: {
  size: number;
  children: ReactNode;
}) {
  const tone = useTone();
  return (
    <View
      style={[
        {
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          padding: 3,
        },
        goldGlow,
      ]}
    >
      <GoldFill style={{ borderRadius: (size + 6) / 2 }} />
      <View
        style={{
          flex: 1,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: PAL[tone].bg,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** Texte or métallique (logo, accents). Sur le web, retombe sur la couleur champagne. */
export function GoldText({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  const tone = useTone();
  if (tone === "light")
    return (
      <Text style={[style, { color: PAL.light.primary }]}>{children}</Text>
    );
  if (Platform.OS === "web") {
    return (
      <Text
        style={[
          style,
          {
            color: "#E4BB78",
            // @ts-expect-error — propriétés CSS web
            backgroundImage:
              "linear-gradient(135deg, #FFE4AC 0%, #D9AC65 45%, #B98236 75%, #F5D394 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          },
        ]}
      >
        {children}
      </Text>
    );
  }
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: "transparent" }]}>
          {children}
        </Text>
      }
    >
      <LinearGradient {...GOLD}>
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  sheenTop: { position: "absolute", left: 0, right: 0, top: 0, height: "55%" },
  hairline: { position: "absolute", left: 0, right: 0, top: 0, height: 1 },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#0E0E0E",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  btnText: { color: colors.onPrimary, fontWeight: "800", letterSpacing: 0.2 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: goldBorder,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
});
