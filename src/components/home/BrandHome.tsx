// Accueil de l'espace Marque (maquette) : bannière, recherche, créateurs recommandés, nouvelles campagnes.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Empty } from "../../kit";
import { GlossCard, GlossFill, GoldButton, GoldPill, GoldRing, goldBorder, goldBorderStrong, luxShadow } from "../../lux";
import { budgetLabel, useDB, useMe } from "../../store";
import { colors, fonts, radius } from "../../theme";
import type { Profile } from "../../types";
import { Logo, Press } from "../../ui";
import { formatFollowers } from "../account/constants";
import { avatarOf, nameOf } from "../collab/common";
import { SpaceSwitcher } from "../SpaceSwitcher";
import { initials, shortName, totalFollowers } from "./CreatorTile";

const W = Dimensions.get("window").width;
const CARD_W = Math.floor((W - 32 - 16) / 3);
const CATS = ["Tous", "Beauté", "Mode", "Lifestyle", "Tech", "Voyage", "Cuisine", "Fitness"];
const HERO = require("../../../assets/brand/hero.jpg");

function CreatorCard({ p }: { p: Profile }) {
  const favorites = useDB((s) => s.favorites);
  const userId = useDB((s) => s.userId);
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const fav = favorites.some((f) => f.brand_id === userId && f.creator_id === p.user_id);
  const tags = [p.category, ...(p.tags ?? [])].filter(Boolean).slice(0, 2) as string[];
  return (
    <Press onPress={() => router.push(`/profile/${p.user_id}`)} style={[styles.card, luxShadow]} scaleTo={0.96}>
      <View style={styles.mono}>
        <Text style={styles.monoText}>{initials(p.full_name)}</Text>
      </View>
      <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" transition={300} />
      <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.7)", "rgba(11,11,11,0.97)"]} locations={[0.3, 0.58, 1]} style={StyleSheet.absoluteFill} />
      <Press onPress={() => toggleFavorite(p.user_id)} style={styles.heart} scaleTo={0.8} hitSlop={8}>
        <Ionicons name={fav ? "heart" : "heart-outline"} size={16} color={fav ? colors.primary : colors.ink} />
      </Press>
      <View style={styles.cardBody}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={styles.cardName} numberOfLines={1}>
            {shortName(p.full_name)}
          </Text>
          {p.identity_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
        </View>
        <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
          {tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>
                {t}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.cardFollowers}>{formatFollowers(totalFollowers(p))}</Text>
          <Ionicons name="location-outline" size={11} color={colors.inkSoft} />
          <Text style={styles.cardCity} numberOfLines={1}>
            {p.residence_country ?? p.country}
          </Text>
        </View>
      </View>
    </Press>
  );
}

export function BrandHome() {
  const insets = useSafeAreaInsets();
  const me = useMe();
  const profiles = useDB((s) => s.profiles);
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const notifications = useDB((s) => s.notifications);
  const userId = useDB((s) => s.userId);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  const unread = useMemo(() => notifications.some((n) => n.user_id === userId && !n.is_read), [notifications, userId]);

  const creators = useMemo(() => {
    const s = q.trim().toLowerCase();
    return profiles
      .filter((p) => p.role === "creator" && !p.is_banned)
      .filter((p) => cat === "Tous" || p.category === cat || p.tags?.includes(cat))
      .filter((p) => !s || `${p.full_name} ${p.category} ${p.tags?.join(" ")} ${p.country}`.toLowerCase().includes(s))
      .sort((a, b) => totalFollowers(b) - totalFollowers(a));
  }, [profiles, q, cat]);
  const campaigns = useMemo(() => offers.filter((o) => o.status === "active").sort((a, b) => b.created_at.localeCompare(a.created_at)), [offers]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={["rgba(217,172,101,0.18)", "rgba(217,172,101,0)"]} start={{ x: 0.9, y: 0 }} end={{ x: 0.2, y: 0.7 }} style={styles.ambient} pointerEvents="none" />

      <Animated.View entering={FadeIn.duration(500)} style={styles.top}>
        <View style={{ gap: 10 }}>
          <Logo size={36} />
          <SpaceSwitcher />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Press onPress={() => router.push("/notifications")} style={styles.iconBtn} scaleTo={0.9}>
            <Ionicons name="notifications-outline" size={22} color={colors.ink} />
            {unread && <View style={styles.dot} />}
          </Press>
          <Press onPress={() => router.navigate("/(tabs)/profile")} scaleTo={0.92}>
            <GoldRing size={50}>
              <View style={styles.logoMono}>
                <Text style={styles.logoMonoText}>{nameOf(me).slice(0, 2).toUpperCase()}</Text>
                <Image source={avatarOf(me)} style={StyleSheet.absoluteFill} contentFit="cover" />
              </View>
            </GoldRing>
          </Press>
        </View>
      </Animated.View>

      {/* Bannière */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <GlossCard gold style={styles.banner}>
          <Image source={HERO} style={styles.bannerImg} contentFit="cover" />
          <LinearGradient colors={["#0B0B0B", "rgba(11,11,11,0.85)", "rgba(11,11,11,0)"]} locations={[0, 0.45, 0.8]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <Text style={styles.bannerTitle}>
            Trouvez{"\n"}les créateurs idéaux{"\n"}
            <Text style={{ color: colors.primary }}>pour votre marque.</Text>
          </Text>
          <GoldButton label="Créer une campagne" onPress={() => router.push("/offer/edit")} style={{ marginTop: 12 }} />
        </GlossCard>
      </Animated.View>

      {/* Recherche */}
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <GlossFill />
          <Ionicons name="search-outline" size={19} color={colors.inkSoft} />
          <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un créateur…" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <Press onPress={() => router.push("/(tabs)/offers?tab=creators")} style={styles.filterBtn} scaleTo={0.9}>
          <GlossFill style={{ borderRadius: 25 }} />
          <Ionicons name="options-outline" size={21} color={colors.ink} />
        </Press>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
        {CATS.map((c) => (
          <GoldPill key={c} label={c} on={cat === c} onPress={() => setCat(c)} />
        ))}
      </ScrollView>

      {/* Créateurs recommandés */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Créateurs recommandés</Text>
        <Press onPress={() => router.push("/(tabs)/offers?tab=creators")} style={styles.seeAll}>
          <Text style={styles.seeAllText}>Voir tout</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Press>
      </View>
      {creators.length === 0 ? (
        <Empty icon="people-outline" title="Aucun créateur trouvé" text="Essaie une autre catégorie ou une autre recherche." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {creators.slice(0, 10).map((p, i) => (
            <Animated.View key={p.user_id} entering={FadeInRight.delay(150 + i * 60).springify()} layout={LinearTransition}>
              <CreatorCard p={p} />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Nouvelles campagnes */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Nouvelles campagnes</Text>
        <Press onPress={() => router.push("/(tabs)/offers?tab=offers")} style={styles.seeAll}>
          <Text style={styles.seeAllText}>Voir tout</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Press>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
        {campaigns.map((o, i) => {
          const b = profiles.find((p) => p.user_id === o.brand_id);
          const apps = applications.filter((a) => a.offer_id === o.id).length;
          return (
            <Animated.View key={o.id} entering={FadeInRight.delay(250 + i * 70).springify()}>
              <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.camp, luxShadow]} scaleTo={0.97}>
                <GlossFill />
                <View style={styles.campLogo}>
                  <Text style={styles.logoMonoText}>{nameOf(b).slice(0, 2).toUpperCase()}</Text>
                  <Image source={avatarOf(b)} style={StyleSheet.absoluteFill} contentFit="cover" />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.campTitle} numberOfLines={1}>
                    {o.title}
                  </Text>
                  <View style={[styles.tag, { alignSelf: "flex-start" }]}>
                    <Text style={styles.tagText}>{o.category}</Text>
                  </View>
                  <Text style={styles.campBudget} numberOfLines={1}>
                    {budgetLabel(o)}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="location-outline" size={11} color={colors.inkSoft} />
                    <Text style={styles.campApps}>
                      {apps} candidature{apps > 1 ? "s" : ""}
                    </Text>
                  </View>
                </View>
              </Press>
            </Animated.View>
          );
        })}
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ambient: { position: "absolute", top: 0, left: 0, right: 0, height: 420 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: "#E5484D", borderWidth: 1.5, borderColor: colors.bg },
  logoMono: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0B0B" },
  logoMonoText: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 15 },
  banner: { height: 172, padding: 18, justifyContent: "center" },
  bannerImg: { position: "absolute", right: 0, top: 0, bottom: 0, width: "58%" },
  bannerTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 21, lineHeight: 25 },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 16 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 50, borderRadius: radius.pill, paddingHorizontal: 16, overflow: "hidden", borderWidth: 1, borderColor: goldBorder },
  input: { flex: 1, minWidth: 0, fontSize: 13, color: colors.ink, zIndex: 1 },
  filterBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: goldBorder, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 8, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeAllText: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  card: { width: CARD_W, height: CARD_W * 1.5, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#141210" },
  mono: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  monoText: { fontFamily: fonts.serif, color: "#D9AC65", fontSize: 30, opacity: 0.8 },
  heart: { position: "absolute", top: 7, right: 7, width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "rgba(248,246,242,0.4)", backgroundColor: "rgba(11,11,11,0.35)", alignItems: "center", justifyContent: "center" },
  cardBody: { position: "absolute", left: 7, right: 7, bottom: 8, gap: 5 },
  cardName: { color: colors.ink, fontSize: 13, fontWeight: "800", flexShrink: 1 },
  tag: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: "rgba(40,40,40,0.85)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  tagText: { color: colors.ink, fontSize: 9, fontWeight: "600" },
  cardFollowers: { color: colors.ink, fontSize: 11, fontWeight: "800" },
  cardCity: { color: colors.inkSoft, fontSize: 9, flexShrink: 1 },
  camp: { width: W * 0.68, flexDirection: "row", gap: 12, padding: 12, borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: goldBorderStrong, backgroundColor: "#0E0E0E" },
  campLogo: { width: 52, height: 52, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: goldBorder, backgroundColor: "#0B0B0B", alignItems: "center", justifyContent: "center" },
  campTitle: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  campBudget: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  campApps: { color: colors.inkSoft, fontSize: 10 },
});
