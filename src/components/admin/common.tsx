import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ReactNode, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useDB, useMe } from "../../store";
import { colors, radius, shadow, type } from "../../theme";
import { Press } from "../../ui";

export const SECTIONS = [
  { value: "stats", label: "Stats", icon: "stats-chart" },
  { value: "users", label: "Utilisateurs", icon: "people" },
  { value: "verification", label: "Identités", icon: "id-card" },
  { value: "social", label: "Réseaux", icon: "logo-instagram" },
  { value: "moderation", label: "Modération", icon: "flag" },
  { value: "commissions", label: "Commissions", icon: "trending-up" },
  { value: "withdrawals", label: "Retraits", icon: "wallet" },
  { value: "legal", label: "Légal", icon: "document-text" },
  { value: "notifications", label: "Notifs", icon: "notifications" },
  { value: "invites", label: "Codes", icon: "key" },
] as const;
export type SectionKey = (typeof SECTIONS)[number]["value"];

export function useAdminGuard() {
  const me = useMe();
  const ok = me?.role === "admin";
  useEffect(() => {
    if (!ok) router.replace("/");
  }, [ok]);
  return ok;
}

export const logout = () => {
  useDB.getState().signOut();
  router.replace("/");
};

export function StatTile({ label, value, icon, tone = "light", i = 0, sub }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; tone?: "light" | "dark" | "primary"; i?: number; sub?: string }) {
  const dark = tone !== "light";
  return (
    <Animated.View entering={FadeInDown.delay(i * 50).springify()} style={[st.tile, shadow.soft, tone === "dark" && { backgroundColor: colors.night }, tone === "primary" && { backgroundColor: colors.primary }]}>
      <View style={[st.tileIcon, dark && { backgroundColor: "rgba(255,255,255,0.14)" }]}>
        <Ionicons name={icon} size={18} color={dark ? "#fff" : colors.primary} />
      </View>
      <Text style={[st.tileVal, dark && { color: "#fff" }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[type.small, dark && { color: "rgba(255,255,255,0.75)" }]} numberOfLines={1}>{label}</Text>
      {sub ? <Text style={[type.tiny, dark && { color: "rgba(255,255,255,0.6)" }]}>{sub}</Text> : null}
    </Animated.View>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <View style={st.grid}>{children}</View>;
}

export function Act({ label, icon, onPress, tone = "light" }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tone?: "light" | "danger" | "success" | "dark" | "primary" }) {
  const bg = { light: colors.surface, danger: "#FDE7E7", success: "#DDF5E8", dark: colors.night, primary: colors.primary }[tone];
  const fg = { light: colors.ink, danger: "#C53030", success: colors.success, dark: "#fff", primary: "#fff" }[tone];
  return (
    <Press onPress={onPress} style={[st.act, { backgroundColor: bg }]} scaleTo={0.94}>
      <Ionicons name={icon} size={15} color={fg} />
      <Text style={{ color: fg, fontWeight: "700", fontSize: 11 }}>{label}</Text>
    </Press>
  );
}

export function Item({ children, i = 0, onPress }: { children: ReactNode; i?: number; onPress?: () => void }) {
  const inner = <View style={[st.item, shadow.soft]}>{children}</View>;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(i, 8) * 45).springify()}>
      {onPress ? <Press onPress={onPress} scaleTo={0.98}>{inner}</Press> : inner}
    </Animated.View>
  );
}

export function H({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
      <Text style={[type.h3, { flex: 1 }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Placeholder({ label, icon, h = 140 }: { label: string; icon: keyof typeof Ionicons.glyphMap; h?: number }) {
  return (
    <View style={[st.ph, { height: h }]}>
      <Ionicons name={icon} size={28} color={colors.muted} />
      <Text style={type.tiny}>{label}</Text>
    </View>
  );
}

export const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexBasis: "47%", flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 4 },
  tileIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  tileVal: { fontSize: 23, fontWeight: "800", color: colors.ink, letterSpacing: -0.6 },
  act: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  item: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ph: { borderRadius: radius.md, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center", gap: 6, flex: 1 },
  name: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
