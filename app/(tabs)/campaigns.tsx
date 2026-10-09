import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fcfa, myCollabs, offers } from "../../src/data";
import { colors, radius, shadow, type } from "../../src/theme";
import { BrandDot, Meta, Press } from "../../src/ui";

const TABS = ["Explorer", "Mes collabs"] as const;

export default function Campaigns() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Explorer");

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140, paddingHorizontal: 20 }}>
      <Text style={type.h1}>Campagnes</Text>
      <Text style={[type.body, { marginTop: 4 }]}>Trouvez la collaboration qui vous ressemble.</Text>

      <View style={styles.segment}>
        {TABS.map((t) => (
          <Press key={t} onPress={() => setTab(t)} style={[styles.segItem, tab === t && [styles.segOn, shadow.soft]]} scaleTo={0.97}>
            <Text style={[styles.segText, tab === t && { color: colors.ink }]}>{t}</Text>
          </Press>
        ))}
      </View>

      {tab === "Explorer" ? (
        <View style={{ gap: 14 }}>
          {offers.map((o, i) => (
            <Animated.View key={o.id} entering={FadeInDown.delay(i * 60).springify()} layout={LinearTransition}>
              <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.row, shadow.soft]} scaleTo={0.98}>
                <Image source={o.image} style={styles.thumb} contentFit="cover" transition={250} />
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <BrandDot name={o.brand} color={o.brandColor} size={16} />
                    <Text style={type.small}>{o.brand}</Text>
                  </View>
                  <Text style={type.h3} numberOfLines={2}>
                    {o.title}
                  </Text>
                  <Meta icon="location-outline" text={o.location} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                    <Text style={{ fontWeight: "800", color: colors.primary }}>{fcfa(o.budget)}</Text>
                    <Text style={type.tiny}>{o.applicants} candidats</Text>
                  </View>
                </View>
              </Press>
            </Animated.View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {myCollabs.map((c, i) => {
            const o = offers.find((x) => x.id === c.id)!;
            return (
              <Animated.View key={c.id} entering={FadeInDown.delay(i * 70).springify()}>
                <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.collab, shadow.soft]} scaleTo={0.98}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Image source={o.image} style={{ width: 48, height: 48, borderRadius: 14 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={type.h3} numberOfLines={1}>
                        {o.title}
                      </Text>
                      <Text style={type.small}>{o.brand}</Text>
                    </View>
                    <View style={[styles.status, c.progress === 1 && { backgroundColor: "#DDF5E8" }]}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: c.progress === 1 ? colors.success : colors.primary }}>{c.status}</Text>
                    </View>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${c.progress * 100}%` }, c.progress === 1 && { backgroundColor: colors.success }]} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Meta icon="calendar-outline" text={o.deadline} />
                    <Text style={{ fontWeight: "800", color: colors.ink }}>{fcfa(o.budget)}</Text>
                  </View>
                </Press>
              </Animated.View>
            );
          })}
          <View style={styles.tip}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={[type.small, { flex: 1, color: colors.inkSoft }]}>
              Astuce : un portfolio complet multiplie par 3 vos chances d'être retenue.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", backgroundColor: "#F1E8E2", borderRadius: radius.pill, padding: 4, marginVertical: 20 },
  segItem: { flex: 1, height: 42, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.surface },
  segText: { fontWeight: "700", color: colors.muted },
  row: { flexDirection: "row", gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10 },
  thumb: { width: 96, height: 112, borderRadius: radius.md },
  collab: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 14 },
  status: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  tip: { flexDirection: "row", gap: 10, alignItems: "center", padding: 14, borderRadius: radius.md, backgroundColor: colors.primarySoft },
});
