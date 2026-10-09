import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SECTIONS, SectionKey, useAdminGuard } from "../../src/components/admin/common";
import { Invites, Legal, Notifs } from "../../src/components/admin/Content";
import { Commissions, Withdrawals } from "../../src/components/admin/Money";
import { Identities, Moderation, Socials } from "../../src/components/admin/Review";
import Stats from "../../src/components/admin/Stats";
import Users from "../../src/components/admin/Users";
import { colors, radius, type } from "../../src/theme";
import { Glass, IconButton, Press } from "../../src/ui";

const VIEWS: Record<SectionKey, () => React.JSX.Element> = {
  stats: Stats, users: Users, verification: Identities, social: Socials, moderation: Moderation,
  commissions: Commissions, withdrawals: Withdrawals, legal: Legal, notifications: Notifs, invites: Invites,
};

export default function AdminSection() {
  const ok = useAdminGuard();
  const insets = useSafeAreaInsets();
  const { section } = useLocalSearchParams<{ section: string }>();
  const key = (SECTIONS.some((x) => x.value === section) ? section : "stats") as SectionKey;
  const View_ = VIEWS[key];
  if (!ok) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton name="chevron-back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/admin"))} />
        <Text style={[type.h1, { flex: 1 }]} numberOfLines={1}>{SECTIONS.find((x) => x.value === key)!.label}</Text>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 8 }}>
          {SECTIONS.map((x) => {
            const on = x.value === key;
            return (
              <Press key={x.value} onPress={() => router.setParams({ section: x.value })} scaleTo={0.92}>
                <Glass style={[s.chip, on && s.chipOn]} intensity={on ? 0 : 30}>
                  <Text style={{ fontWeight: "700", fontSize: 13, color: on ? "#fff" : colors.ink }}>{x.label}</Text>
                </Glass>
              </Press>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Animated.View key={key} entering={FadeIn.duration(220)}>
          <View_ />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 36, justifyContent: "center", borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.night, borderColor: colors.night },
});
