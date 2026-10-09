import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logout, SECTIONS, SectionKey, useAdminGuard } from "../../src/components/admin/common";
import { fcfa, useDB } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { IconButton, Press } from "../../src/ui";

export default function AdminHome() {
  const ok = useAdminGuard();
  const insets = useSafeAreaInsets();
  const profiles = useDB((s) => s.profiles);
  const socials = useDB((s) => s.socialVerifications);
  const reports = useDB((s) => s.reports);
  const ws = useDB((s) => s.withdrawals);
  const collabs = useDB((s) => s.collaborations);
  const badges = useMemo<Partial<Record<SectionKey, number>>>(() => ({
    verification: profiles.filter((p) => p.identity_submitted_at && !p.identity_verified).length,
    social: socials.filter((v) => v.status === "pending_admin").length,
    moderation: reports.filter((r) => r.status === "pending").length,
    withdrawals: ws.filter((w) => ["pending", "approved", "processing"].includes(w.status)).length,
  }), [profiles, socials, reports, ws]);
  const revenue = useMemo(() => collabs.filter((c) => c.status === "completed").reduce((t, c) => t + c.platform_fee, 0), [collabs]);
  const todo = Object.values(badges).reduce((a, b) => a + (b ?? 0), 0);
  if (!ok) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.springify()} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={type.small}>Collab Créa</Text>
          <Text style={type.h1}>Admin Panel</Text>
        </View>
        <IconButton name="log-out-outline" onPress={logout} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(60).springify()}>
        <LinearGradient colors={[colors.night, "#3A1A10"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, shadow.soft]}>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Commissions perçues</Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -1 }}>{fcfa(revenue)}</Text>
          <View style={s.pill}>
            <Ionicons name={todo ? "alert-circle" : "checkmark-circle"} size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700" }}>{todo ? `${todo} élément(s) à traiter` : "Tout est à jour"}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <View style={s.grid}>
        {SECTIONS.map((sec, i) => {
          const n = badges[sec.value] ?? 0;
          return (
            <Animated.View key={sec.value} entering={FadeInDown.delay(100 + i * 40).springify()} style={{ width: "31%", flexGrow: 1 }}>
              <Press onPress={() => router.push(`/admin/${sec.value}`)} style={[s.tile, shadow.soft]} scaleTo={0.93}>
                <View style={s.icon}><Ionicons name={sec.icon} size={22} color={colors.primary} /></View>
                <Text style={s.label} numberOfLines={1}>{sec.label}</Text>
                {n > 0 ? <View style={s.badge}><Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{n}</Text></View> : null}
              </Press>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hero: { borderRadius: radius.xl, padding: 20, gap: 6 },
  pill: { flexDirection: "row", gap: 6, alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,90,54,0.85)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 18, alignItems: "center", gap: 8 },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "700", color: colors.ink },
  badge: { position: "absolute", top: 8, right: 8, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
});
