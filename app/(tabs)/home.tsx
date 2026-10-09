// Accueil : découverte des créateurs au premier plan (les campagnes vivent dans l'onglet Campagnes).
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ALL_PLATFORMS, formatFollowers, parseFollowers, PLATFORM } from "../../src/components/account/constants";
import { avatarOf, flagOf, nameOf } from "../../src/components/collab/common";
import { Empty } from "../../src/kit";
import { fcfa, useDB, useMe } from "../../src/store";
import { colors, fonts, radius, type } from "../../src/theme";
import type { Profile, SocialPlatform } from "../../src/types";
import { Avatar, IconButton, Press } from "../../src/ui";

const W = Dimensions.get("window").width;
const GAP = 12;
const CARD_W = (W - 40 - GAP) / 2;

const CATS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "Toutes", icon: "apps-outline" },
  { key: "Beauté", label: "Beauté", icon: "sparkles-outline" },
  { key: "Mode", label: "Mode", icon: "shirt-outline" },
  { key: "Tech", label: "Tech", icon: "phone-portrait-outline" },
  { key: "Cuisine", label: "Cuisine", icon: "restaurant-outline" },
  { key: "Fitness", label: "Fitness", icon: "barbell-outline" },
  { key: "Humour", label: "Humour", icon: "happy-outline" },
  { key: "Lifestyle", label: "Lifestyle", icon: "cafe-outline" },
];

const totalFollowers = (p: Profile) => Object.values(p.followers).reduce((a, f) => a + parseFollowers(f), 0);
const topPlatform = (p: Profile) =>
  (Object.entries(p.followers) as [SocialPlatform, string][]).sort((a, b) => parseFollowers(b[1]) - parseFollowers(a[1]))[0]?.[0];

function Header() {
  const me = useMe();
  const notifications = useDB((s) => s.notifications);
  const userId = useDB((s) => s.userId);
  const unread = useMemo(() => notifications.some((n) => n.user_id === userId && !n.is_read), [notifications, userId]);
  const first = me?.role === "brand" ? nameOf(me) : me?.full_name.split(" ")[0];
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.header}>
      <Press onPress={() => router.navigate("/(tabs)/profile")} scaleTo={0.92}>
        <Avatar uri={avatarOf(me)} size={54} ring />
      </Press>
      <View style={{ flex: 1 }}>
        <Text style={type.small}>Bonjour,</Text>
        <Text style={styles.hello} numberOfLines={1}>
          {first} 👋
        </Text>
        <Text style={type.tiny}>{me?.role === "brand" ? "Trouvez les voix de votre marque" : "Découvrez la communauté Collab Créa"}</Text>
      </View>
      <IconButton name="notifications-outline" badge={unread} onPress={() => router.push("/notifications")} />
    </Animated.View>
  );
}

/** Raccourci propre au rôle : stats marque, ou accès aux campagnes pour le créateur. */
function RoleStrip() {
  const me = useMe();
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const collaborations = useDB((s) => s.collaborations);
  const stats = useMemo(() => {
    if (!me) return null;
    if (me.role === "brand") {
      const mine = offers.filter((o) => o.brand_id === me.user_id);
      const active = mine.filter((o) => o.status === "active").length;
      const apps = applications.filter((a) => mine.some((o) => o.id === a.offer_id)).length;
      const month = new Date().getMonth();
      const spent = collaborations
        .filter((c) => c.brand_id === me.user_id && c.paid && new Date(c.created_at).getMonth() === month)
        .reduce((a, c) => a + c.agreed_amount, 0);
      return { brand: true, active, apps, spent };
    }
    const open = offers.filter((o) => o.status === "active").length;
    return { brand: false, open };
  }, [me, offers, applications, collaborations]);
  if (!stats) return null;

  if (stats.brand)
    return (
      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.strip}>
        {[
          ["Offres actives", String(stats.active)],
          ["Candidatures", String(stats.apps)],
          ["Investi ce mois", fcfa(stats.spent ?? 0)],
        ].map(([l, v], i) => (
          <View key={l} style={[styles.stripCell, i > 0 && styles.stripDivider]}>
            <Text style={styles.stripValue} numberOfLines={1}>
              {v}
            </Text>
            <Text style={type.tiny}>{l}</Text>
          </View>
        ))}
        <Press onPress={() => router.push("/offer/edit")} style={styles.stripCta} scaleTo={0.9}>
          <Ionicons name="add" size={22} color={colors.onPrimary} />
        </Press>
      </Animated.View>
    );

  return (
    <Animated.View entering={FadeInDown.delay(120).springify()}>
      <Press onPress={() => router.navigate("/(tabs)/offers")} style={styles.campaignLink} scaleTo={0.98}>
        <View style={styles.campaignIcon}>
          <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{stats.open} campagnes ouvertes</Text>
          <Text style={type.tiny}>Postulez depuis l'onglet Campagnes</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
      </Press>
    </Animated.View>
  );
}

function Spotlight({ p }: { p: Profile }) {
  return (
    <Press onPress={() => router.push(`/profile/${p.user_id}`)} style={styles.spotlight} scaleTo={0.98}>
      <Image source={p.banner_url || p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
      <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.55)", "rgba(11,11,11,0.95)"]} locations={[0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.spotlightTag}>
        <Text style={styles.eyebrow}>CRÉATEUR À LA UNE</Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.spotlightName}>{p.full_name}</Text>
        <Text style={{ color: colors.inkSoft, fontSize: 13 }}>
          {p.category} · {flagOf(p.country)} {p.country} · {formatFollowers(totalFollowers(p))} abonnés
        </Text>
        <View style={styles.ctaSmall}>
          <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 13 }}>Voir le profil</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.onPrimary} />
        </View>
      </View>
    </Press>
  );
}

function CreatorCard({ p, index }: { p: Profile; index: number }) {
  const favorites = useDB((s) => s.favorites);
  const userId = useDB((s) => s.userId);
  const me = useMe();
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const fav = favorites.some((f) => f.brand_id === userId && f.creator_id === p.user_id);
  const plat = topPlatform(p);
  return (
    <Animated.View entering={FadeInDown.delay(80 + (index % 6) * 60).springify()} layout={LinearTransition.springify()}>
      <Press onPress={() => router.push(`/profile/${p.user_id}`)} style={styles.card} scaleTo={0.97}>
        <View style={styles.cardPhoto}>
          <Image source={p.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.85)"]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
          {me?.role === "brand" && (
            <Press onPress={() => toggleFavorite(p.user_id)} style={styles.fav} scaleTo={0.8}>
              <Ionicons name={fav ? "heart" : "heart-outline"} size={16} color={fav ? colors.primary : colors.ink} />
            </Press>
          )}
          <View style={styles.cardFoot}>
            {plat && <Ionicons name={PLATFORM[plat].icon} size={12} color={colors.primaryLight} />}
            <Text style={styles.cardFollowers}>{formatFollowers(totalFollowers(p))}</Text>
          </View>
        </View>
        <View style={{ padding: 12, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {p.full_name}
            </Text>
            {p.identity_verified && <Ionicons name="checkmark-circle" size={14} color={colors.primary} />}
          </View>
          <Text style={type.tiny} numberOfLines={1}>
            {p.category} · {flagOf(p.country)} {p.country}
          </Text>
          <View style={styles.viewBtn}>
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Voir le profil</Text>
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const profiles = useDB((s) => s.profiles);
  const userId = useDB((s) => s.userId);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [country, setCountry] = useState("all");
  const [platform, setPlatform] = useState<SocialPlatform | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const creators = useMemo(
    () => profiles.filter((p) => p.role === "creator" && !p.is_banned && p.user_id !== userId).sort((a, b) => totalFollowers(b) - totalFollowers(a)),
    [profiles, userId],
  );
  const countries = useMemo(() => Array.from(new Set(creators.map((c) => c.country).filter(Boolean))) as string[], [creators]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return creators.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        (country === "all" || p.country === country) &&
        (platform === "all" || parseFollowers(p.followers[platform]) > 0) &&
        (!s || `${p.full_name} ${p.category} ${p.country}`.toLowerCase().includes(s)),
    );
  }, [creators, q, cat, country, platform]);
  const filtering = q || cat !== "all" || country !== "all" || platform !== "all";
  const spotlight = !filtering ? list[0] : undefined;
  const grid = spotlight ? list.slice(1) : list;
  const activeFilters = (country !== "all" ? 1 : 0) + (platform !== "all" ? 1 : 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
      <Header />

      <View style={{ paddingHorizontal: 20, marginTop: 18, gap: 14 }}>
        <RoleStrip />
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={19} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Rechercher un créateur, une catégorie…" placeholderTextColor={colors.muted} style={styles.input} />
          </View>
          <Press onPress={() => setShowFilters((v) => !v)} style={[styles.filterBtn, (showFilters || activeFilters > 0) && styles.filterOn]} scaleTo={0.9}>
            <Ionicons name="options-outline" size={20} color={showFilters || activeFilters > 0 ? colors.onPrimary : colors.ink} />
            {activeFilters > 0 && <Text style={styles.filterCount}>{activeFilters}</Text>}
          </Press>
        </Animated.View>
      </View>

      {showFilters && (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10, marginTop: 14 }}>
          <Text style={[styles.filterLabel, { paddingHorizontal: 20 }]}>Pays</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {["all", ...countries].map((c) => (
              <Pill key={c} label={c === "all" ? "Tous les pays" : `${flagOf(c)} ${c}`} on={country === c} onPress={() => setCountry(c)} />
            ))}
          </ScrollView>
          <Text style={[styles.filterLabel, { paddingHorizontal: 20 }]}>Plateforme</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <Pill label="Toutes" on={platform === "all"} onPress={() => setPlatform("all")} />
            {ALL_PLATFORMS.map((p) => (
              <Pill key={p} label={PLATFORM[p].label} icon={PLATFORM[p].icon} on={platform === p} onPress={() => setPlatform(p)} />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 18 }}>
        {CATS.map((c, i) => {
          const on = c.key === cat;
          return (
            <Animated.View key={c.key} entering={FadeInDown.delay(200 + i * 40).springify()}>
              <Press onPress={() => setCat(c.key)} style={{ alignItems: "center", gap: 7 }} scaleTo={0.9}>
                <View style={[styles.catIcon, on ? styles.catOn : styles.catOff]}>
                  <Ionicons name={c.icon} size={22} color={on ? colors.onPrimary : colors.ink} />
                </View>
                <Text style={[styles.catLabel, on && { color: colors.primary }]}>{c.label}</Text>
              </Press>
            </Animated.View>
          );
        })}
      </ScrollView>

      {spotlight && (
        <Animated.View entering={FadeInDown.delay(260).springify()} style={{ paddingHorizontal: 20 }}>
          <Spotlight p={spotlight} />
        </Animated.View>
      )}

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{filtering ? "Résultats" : "Créateurs à découvrir"}</Text>
        <Text style={type.small}>
          {list.length} profil{list.length > 1 ? "s" : ""}
        </Text>
      </View>

      {list.length === 0 ? (
        <Empty icon="people-outline" title="Aucun créateur trouvé" text="Essayez une autre catégorie, un autre pays ou une autre plateforme." />
      ) : (
        <View style={styles.grid}>
          {grid.map((p, i) => (
            <CreatorCard key={p.user_id} p={p} index={i} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function Pill({ label, on, onPress, icon }: { label: string; on: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Press onPress={onPress} style={[styles.pill, on && styles.pillOn]} scaleTo={0.94}>
      {icon && <Ionicons name={icon} size={14} color={on ? colors.onPrimary : colors.inkSoft} />}
      <Text style={{ fontSize: 13, fontWeight: "600", color: on ? colors.onPrimary : colors.inkSoft }}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  hello: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.ink },
  strip: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, paddingVertical: 14, paddingLeft: 6, paddingRight: 10 },
  stripCell: { flex: 1, alignItems: "center", gap: 2 },
  stripDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
  stripValue: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  stripCta: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginLeft: 6 },
  campaignLink: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 14 },
  campaignIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", gap: 10 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 50, borderRadius: radius.pill, paddingHorizontal: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  input: { flex: 1, minWidth: 0, fontSize: 14, color: colors.ink },
  filterBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterCount: { position: "absolute", top: 6, right: 8, fontSize: 10, fontWeight: "800", color: colors.onPrimary },
  filterLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  catIcon: { width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  catOn: { backgroundColor: colors.primary },
  catOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  catLabel: { fontSize: 12, color: colors.inkSoft, fontWeight: "600" },
  spotlight: { height: 380, borderRadius: radius.xl, overflow: "hidden", padding: 20, justifyContent: "space-between", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  spotlightTag: { alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(216,173,106,0.5)", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(11,11,11,0.5)" },
  eyebrow: { color: colors.primaryLight, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  spotlightName: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.ink },
  ctaSmall: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 18, height: 40, borderRadius: radius.pill, marginTop: 8 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, marginTop: 28, marginBottom: 14 },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 22, color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, paddingHorizontal: 20 },
  card: { width: CARD_W, backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  cardPhoto: { height: CARD_W * 1.25, backgroundColor: colors.surfaceHi },
  fav: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(11,11,11,0.6)", alignItems: "center", justifyContent: "center" },
  cardFoot: { position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(11,11,11,0.6)", borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  cardFollowers: { color: colors.primaryLight, fontSize: 11, fontWeight: "700" },
  cardName: { color: colors.ink, fontWeight: "700", fontSize: 14, flexShrink: 1 },
  viewBtn: { marginTop: 8, height: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
});
