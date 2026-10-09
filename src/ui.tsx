import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { budgetLabel, useDB } from "./store";
import type { Offer } from "./types";
import { colors, radius, shadow, type } from "./theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const tap = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

/** Pressable qui s'enfonce légèrement au toucher, avec retour haptique. */
export function Press({
  children,
  style,
  scaleTo = 0.96,
  onPress,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle>; scaleTo?: number; children: ReactNode }) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, anim]}
      onPressIn={() => (s.value = withSpring(scaleTo, { damping: 15, stiffness: 400 }))}
      onPressOut={() => (s.value = withSpring(1, { damping: 12, stiffness: 300 }))}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

/** Panneau en verre dépoli. */
export function Glass({
  children,
  style,
  intensity = 40,
  tint = "light",
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark";
}) {
  return (
    <View style={[styles.glassWrap, tint === "dark" && styles.glassDark, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

export function Logo({ size = 44, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Svg width={size * 1.3} height={size} viewBox="0 0 52 40">
        <Path d="M22 6a14 14 0 1 0 0 28" stroke={colors.primary} strokeWidth={8} strokeLinecap="round" fill="none" />
        <Path d="M42 12a10 10 0 1 0 0 16" stroke={colors.ink} strokeWidth={8} strokeLinecap="round" fill="none" />
      </Svg>
      {showText && (
        <View>
          <Text style={{ fontSize: size * 0.62, fontWeight: "800", letterSpacing: -0.8, color: colors.ink }}>
            Collab <Text style={{ color: colors.primary }}>Créa</Text>
          </Text>
          <Text style={{ fontSize: 8.5, letterSpacing: 1.6, fontWeight: "600", color: colors.inkSoft }}>
            CRÉER · COLLABORER · GRANDIR
          </Text>
        </View>
      )}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  icon = "arrow-forward",
  style,
  small,
}: {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "dark" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap | null;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const fg = variant === "primary" || variant === "dark" ? "#fff" : colors.ink;
  return (
    <Press
      onPress={onPress}
      style={[
        styles.btn,
        small && styles.btnSmall,
        variant === "primary" && [styles.btnPrimary, shadow.glow],
        variant === "outline" && styles.btnOutline,
        variant === "dark" && { backgroundColor: colors.night },
        variant === "ghost" && { backgroundColor: colors.primarySoft },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && { fontSize: 14 }, { color: fg }]}>{label}</Text>
      {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
    </Press>
  );
}

export function IconButton({
  name,
  onPress,
  badge,
  dark,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  badge?: boolean;
  dark?: boolean;
}) {
  return (
    <Press onPress={onPress} style={[styles.iconBtn, shadow.soft, dark && { backgroundColor: "rgba(0,0,0,0.35)" }]}>
      <Ionicons name={name} size={22} color={dark ? "#fff" : colors.ink} />
      {badge && <View style={styles.badge} />}
    </Press>
  );
}

export function SectionHeader({ title, action = "Voir tout", onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={type.h2}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>{action}</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Meta({ icon, text, light }: { icon: keyof typeof Ionicons.glyphMap; text: string; light?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Ionicons name={icon} size={14} color={light ? "rgba(255,255,255,0.8)" : colors.muted} />
      <Text style={[type.small, light && { color: "rgba(255,255,255,0.85)" }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

export function BrandDot({ name, color, size = 18 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.5, fontWeight: "800" }}>{name[0]}</Text>
    </View>
  );
}

export function Tag({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <View style={[styles.tag, dark && { backgroundColor: "rgba(20,20,20,0.75)" }]}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: dark ? "#fff" : colors.primary }}>{label}</Text>
    </View>
  );
}

export const OFFER_FALLBACK = "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&q=70";

/** Carte d'offre (format carrousel) basée sur le type Offer du store. */
export function OfferCard({ offer, width = 230, badge }: { offer: Offer; width?: number; badge?: ReactNode }) {
  const brand = useDB((s) => s.profiles.find((p) => p.user_id === offer.brand_id));
  const name = brand?.company_name || brand?.full_name || "Marque";
  return (
    <Press onPress={() => router.push(`/offer/${offer.id}`)} style={[styles.card, shadow.soft, { width }]} scaleTo={0.97}>
      <View>
        <Image source={offer.images[0] ?? OFFER_FALLBACK} style={{ height: 140, width: "100%" }} contentFit="cover" transition={300} />
        <View style={{ position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 }}>
          <Tag label={offer.category} />
          {offer.delivery_mode === "network" ? <Tag label="📱 Réseau" dark /> : null}
        </View>
        {badge ? <View style={{ position: "absolute", top: 10, right: 10 }}>{badge}</View> : null}
      </View>
      <View style={{ padding: 12, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {brand?.logo_url || brand?.avatar_url ? (
            <Image source={brand.logo_url || brand.avatar_url} style={{ width: 20, height: 20, borderRadius: 10 }} />
          ) : (
            <BrandDot name={name} color={colors.primary} />
          )}
          <Text style={{ fontWeight: "600", color: colors.ink, flex: 1 }} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Text style={[type.h3, { minHeight: 42 }]} numberOfLines={2}>
          {offer.title}
        </Text>
        <Meta icon="camera-outline" text={offer.content_types.join(" · ")} />
        <Meta icon={offer.presence_mode === "on_site" ? "storefront-outline" : "location-outline"} text={offer.presence_mode === "on_site" ? `Sur place · ${offer.on_site_city ?? ""}` : offer.location || "Tous les pays africains"} />
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink, marginTop: 4 }} numberOfLines={1}>
          {budgetLabel(offer)}
        </Text>
      </View>
    </Press>
  );
}

export function Avatar({ uri, size = 48, ring }: { uri: string; size?: number; ring?: boolean }) {
  return (
    <View style={ring ? { padding: 2.5, borderRadius: size, borderWidth: 2, borderColor: colors.primary } : undefined}>
      <Image source={uri} style={{ width: size, height: size, borderRadius: size / 2 }} transition={200} />
    </View>
  );
}

const styles = StyleSheet.create({
  glassWrap: {
    overflow: "hidden",
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  glassDark: { backgroundColor: "rgba(20,20,20,0.45)", borderColor: "rgba(255,255,255,0.12)" },
  btn: {
    height: 54,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 22,
  },
  btnSmall: { height: 40, paddingHorizontal: 16 },
  btnPrimary: { backgroundColor: colors.primary },
  btnOutline: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "rgba(255,255,255,0.6)" },
  btnText: { fontSize: 16, fontWeight: "700" },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 11,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  section: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  tag: { backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden" },
});
