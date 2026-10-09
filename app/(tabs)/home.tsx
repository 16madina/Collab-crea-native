// Accueil : découverte des créateurs au premier plan (les campagnes vivent dans l'onglet Campagnes).
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALL_PLATFORMS, parseFollowers, PLATFORM } from "../../src/components/account/constants";
import { avatarOf, flagOf, nameOf } from "../../src/components/collab/common";
import { CreatorTile, totalFollowers } from "../../src/components/home/CreatorTile";
import { Empty } from "../../src/kit";
import { useDB, useMe } from "../../src/store";
import { colors, fonts, radius, type } from "../../src/theme";
import type { SocialPlatform } from "../../src/types";
import { GlossCard, GlossFill, GoldButton, GoldFill, GoldPill, GoldRing, GoldText, goldBorder, goldGlow } from "../../src/lux";
import { Press } from "../../src/ui";

const W = Dimensions.get("window").width;
const GAP = 8;
const COL_W = Math.floor((W - 32 - GAP * 2) / 3);

const CATS = ["Tous", "Beauté", "Mode", "Tech", "Cuisine", "Lifestyle", "Voyage", "Fitness", "Humour"];
const BANNER_IMG = "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=75";

export default function Home() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const profiles = useDB((s) => s.profiles);
  const notifications = useDB((s) => s.notifications);
  const userId = useDB((s) => s.userId);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  const [country, setCountry] = useState("all");
  const [platform, setPlatform] = useState<SocialPlatform | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const unread = useMemo(() => notifications.some((n) => n.user_id === userId && !n.is_read), [notifications, userId]);
  const creators = useMemo(
    () => profiles.filter((p) => p.role === "creator" && !p.is_banned && p.user_id !== userId).sort((a, b) => totalFollowers(b) - totalFollowers(a)),
    [profiles, userId],
  );
  const countries = useMemo(() => Array.from(new Set(creators.map((c) => c.country).filter(Boolean))) as string[], [creators]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return creators.filter(
      (p) =>
        (cat === "Tous" || p.category === cat || p.tags?.includes(cat)) &&
        (country === "all" || p.country === country) &&
        (platform === "all" || parseFollowers(p.followers[platform]) > 0) &&
        (!s || `${p.full_name} ${p.category} ${p.tags?.join(" ")} ${p.country}`.toLowerCase().includes(s)),
    );
  }, [creators, q, cat, country, platform]);
  const activeFilters = (country !== "all" ? 1 : 0) + (platform !== "all" ? 1 : 0);
  const isBrand = me?.role === "brand";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Press onPress={() => router.navigate("/(tabs)/profile")} scaleTo={0.92}>
          <GoldRing size={56}>
            <Image source={avatarOf(me)} style={{ flex: 1 }} contentFit="cover" />
          </GoldRing>
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Bonjour,</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <GoldText style={styles.name}>{isBrand ? nameOf(me) : me?.full_name.split(" ")[0]}</GoldText>
            <Text style={{ fontSize: 20 }}>👋</Text>
          </View>
          <Text style={styles.sub} numberOfLines={2}>
            {isBrand ? "Découvre et collabore avec des créateurs de talent." : "Découvre la communauté et les marques qui recrutent."}
          </Text>
        </View>
        <Press onPress={() => router.push("/notifications")} style={styles.bell} scaleTo={0.9}>
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
          {unread && <View style={styles.bellDot} />}
        </Press>
      </Animated.View>

      {/* Recherche */}
      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.searchRow}>
        <View style={styles.search}>
          <GlossFill />
          <Ionicons name="search-outline" size={20} color={colors.inkSoft} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un créateur, une marque…" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <Press onPress={() => setShowFilters((v) => !v)} style={[styles.filterBtn, (showFilters || activeFilters > 0) && [styles.filterOn, goldGlow]]} scaleTo={0.9}>
          {showFilters || activeFilters > 0 ? <GoldFill style={{ borderRadius: 26 }} /> : <GlossFill style={{ borderRadius: 26 }} />}
          <Ionicons name="options-outline" size={22} color={showFilters || activeFilters > 0 ? colors.onPrimary : colors.ink} />
        </Press>
      </Animated.View>

      {showFilters && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10, marginTop: 14 }}>
          <Text style={styles.filterLabel}>Pays</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {["all", ...countries].map((c) => (
              <GoldPill key={c} label={c === "all" ? "Tous les pays" : `${flagOf(c)} ${c}`} on={country === c} onPress={() => setCountry(c)} />
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Plateforme</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            <GoldPill label="Toutes" on={platform === "all"} onPress={() => setPlatform("all")} />
            {ALL_PLATFORMS.map((p) => (
              <GoldPill key={p} label={PLATFORM[p].label} icon={PLATFORM[p].icon} on={platform === p} onPress={() => setPlatform(p)} />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* Bannière */}
      <Animated.View entering={FadeInDown.delay(140).springify()} style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <Press onPress={() => router.push(isBrand ? "/offer/edit" : "/(tabs)/offers")} scaleTo={0.98}>
          <GlossCard gold style={styles.banner}>
          <Image source={BANNER_IMG} style={styles.bannerImg} contentFit="cover" transition={300} />
          <LinearGradient
            colors={["#0B0B0B", "rgba(11,11,11,0.92)", "rgba(11,11,11,0)"]}
            locations={[0, 0.5, 0.85]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <GoldText style={styles.bannerEyebrow}>{isBrand ? "TROUVE" : "DÉCOUVRE"}</GoldText>
          <Text style={styles.bannerTitle}>{isBrand ? "LE CRÉATEUR IDÉAL" : "TA PROCHAINE COLLAB"}</Text>
          <Text style={styles.bannerSub}>{isBrand ? "pour ta prochaine campagne." : "parmi les campagnes ouvertes."}</Text>
          <GoldButton
            label={isBrand ? "Publier une campagne" : "Voir les campagnes"}
            onPress={() => router.push(isBrand ? "/offer/edit" : "/(tabs)/offers")}
            style={{ marginTop: 12 }}
          />
          </GlossCard>
        </Press>
      </Animated.View>

      {/* Créateurs recommandés */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>Créateurs recommandés pour toi</Text>
        <Press onPress={() => router.push("/marketplace")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={styles.seeAll}>Voir tout</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.primary} />
        </Press>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillRow, { paddingBottom: 14 }]}>
        {CATS.map((c) => (
          <GoldPill key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>

      {list.length === 0 ? (
        <Empty icon="people-outline" title="Aucun créateur trouvé" text="Essaie une autre catégorie, un autre pays ou une autre plateforme." />
      ) : (
        <View style={styles.grid}>
          {list.map((p, i) => (
            <Animated.View key={p.user_id} entering={FadeInDown.delay(60 + (i % 9) * 45).springify()} layout={LinearTransition.springify()}>
              <CreatorTile p={p} width={COL_W} />
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  hello: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  name: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  sub: { color: colors.inkSoft, fontSize: 12, lineHeight: 16 },
  bell: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  bellDot: { position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, borderWidth: 1.5, borderColor: colors.bg },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 18 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 52, borderRadius: radius.pill, paddingHorizontal: 18, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  input: { flex: 1, minWidth: 0, fontSize: 14, color: colors.ink, zIndex: 1 },
  filterBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: goldBorder, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  filterOn: { borderColor: "transparent" },
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", paddingHorizontal: 16 },
  pillRow: { paddingHorizontal: 16, gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 15, borderRadius: radius.pill, backgroundColor: "transparent", borderWidth: 1, borderColor: colors.line },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  banner: { height: 168, padding: 18, justifyContent: "center" },
  bannerImg: { position: "absolute", right: 0, top: 0, bottom: 0, width: "62%" },
  bannerEyebrow: { fontFamily: fonts.serif, color: colors.primary, fontSize: 15, letterSpacing: 1.5 },
  bannerTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 22, lineHeight: 26, letterSpacing: 0.3 },
  bannerSub: { color: colors.inkSoft, fontSize: 13, marginTop: 2 },
  bannerCta: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 16, height: 38, borderRadius: radius.pill, marginTop: 12 },
  bannerCtaText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "700", flex: 1, marginRight: 8 },
  seeAll: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, paddingHorizontal: 16 },
});
