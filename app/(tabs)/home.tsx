import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppStatusBadge, avatarOf, flagOf, nameOf, StatTile } from "../../src/components/collab/common";
import { Badge, Empty } from "../../src/kit";
import { budgetLabel, fcfa, useDB, useMe } from "../../src/store";
import { colors, radius, shadow, type } from "../../src/theme";
import { Avatar, Button, IconButton, OfferCard, Press, SectionHeader } from "../../src/ui";

const W = Dimensions.get("window").width;
const SLIDE_W = W - 40;

const CATS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "Tout", icon: "apps-outline" },
  { key: "Beauté", label: "Beauté", icon: "sparkles-outline" },
  { key: "Mode", label: "Mode", icon: "shirt-outline" },
  { key: "Tech", label: "Tech", icon: "phone-portrait-outline" },
  { key: "Cuisine", label: "Cuisine", icon: "restaurant-outline" },
  { key: "Fitness", label: "Fitness", icon: "barbell-outline" },
  { key: "Lifestyle", label: "Lifestyle", icon: "cafe-outline" },
  { key: "Musique", label: "Musique", icon: "musical-notes-outline" },
];

const SLIDES = [
  { title: "Les marques vous attendent", cta: "Explorer les offres", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=70", to: "/(tabs)/offers" },
  { title: "Paiement sécurisé par séquestre", cta: "Mon portefeuille", image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=70", to: "/wallet" },
  { title: "Faites vérifier vos réseaux", cta: "Vérifier", image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=900&q=70", to: "/verification/social" },
];

function Header({ onBell }: { onBell: () => void }) {
  const me = useMe();
  const notifications = useDB((s) => s.notifications);
  const userId = useDB((s) => s.userId);
  const unread = useMemo(() => notifications.some((n) => n.user_id === userId && !n.is_read), [notifications, userId]);
  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.header}>
      <Press onPress={() => router.navigate("/(tabs)/profile")} scaleTo={0.92}>
        <Avatar uri={avatarOf(me)} size={56} ring />
      </Press>
      <View style={{ flex: 1 }}>
        <Text style={type.body}>Bonjour,</Text>
        <Text style={[type.h1, { fontSize: 22, lineHeight: 26 }]} numberOfLines={1}>
          {me?.role === "brand" ? nameOf(me) : me?.full_name.split(" ")[0]} 👋
        </Text>
        <Text style={type.small}>{me?.role === "brand" ? "Espace marque" : "Créateur·rice de contenu"}</Text>
      </View>
      <IconButton name="notifications-outline" badge={unread} onPress={onBell} />
    </Animated.View>
  );
}

function CreatorHome() {
  const insets = useSafeAreaInsets();
  const offers = useDB((s) => s.offers);
  const profiles = useDB((s) => s.profiles);
  const applications = useDB((s) => s.applications);
  const userId = useDB((s) => s.userId);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [slide, setSlide] = useState(0);

  const active = useMemo(() => offers.filter((o) => o.status === "active"), [offers]);
  const list = useMemo(() => (cat === "all" ? active : active.filter((o) => o.category === cat)), [active, cat]);
  const recruiting = useMemo(() => {
    const ids = [...new Set(active.map((o) => o.brand_id))];
    return ids.map((id) => ({ p: profiles.find((x) => x.user_id === id), n: active.filter((o) => o.brand_id === id).length })).filter((b) => b.p && !b.p.is_banned);
  }, [active, profiles]);
  const appOf = (offerId: string) => applications.find((a) => a.offer_id === offerId && a.creator_id === userId)?.status;

  const search = () => router.navigate({ pathname: "/(tabs)/offers", params: { q } });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Header onBell={() => router.push("/notifications")} />

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} onSubmitEditing={search} returnKeyType="search" placeholder="Rechercher une campagne, une marque…" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <Press style={[styles.filter, shadow.soft]} onPress={search}>
          <Ionicons name="options-outline" size={22} color={colors.ink} />
        </Press>
      </Animated.View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 6 }}>
        {CATS.map((c, i) => {
          const on = c.key === cat;
          return (
            <Animated.View key={c.key} entering={FadeInDown.delay(120 + i * 50).springify()}>
              <Press onPress={() => setCat(c.key)} style={{ alignItems: "center", gap: 6 }} scaleTo={0.9}>
                <View style={[styles.catIcon, on ? [styles.catOn, shadow.glow] : styles.catOff]}>
                  <Ionicons name={c.icon} size={24} color={on ? "#fff" : colors.ink} />
                </View>
                <Text style={[styles.catLabel, on && { color: colors.primary, fontWeight: "700" }]}>{c.label}</Text>
              </Press>
            </Animated.View>
          );
        })}
      </ScrollView>

      <FlatList
        data={SLIDES}
        horizontal
        snapToInterval={SLIDE_W + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, marginTop: 18 }}
        onScroll={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + 12)))}
        scrollEventThrottle={32}
        keyExtractor={(s) => s.title}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SLIDE_W }]}>
            <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            <LinearGradient colors={["rgba(12,12,12,0.95)", "rgba(12,12,12,0.7)", "rgba(12,12,12,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Button label={item.cta} small onPress={() => router.push(item.to as never)} style={{ alignSelf: "flex-start" }} />
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Animated.View key={i} layout={LinearTransition.springify()} style={[styles.dotBase, i === slide && styles.dotOn]} />
        ))}
      </View>

      <SectionHeader title="Campagnes en vedette" onAction={() => router.navigate({ pathname: "/(tabs)/offers", params: { cat: cat === "all" ? "" : cat } })} />
      <FlatList
        key={cat}
        data={list}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingBottom: 12 }}
        keyExtractor={(o) => o.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 70).springify()}>
            <OfferCard offer={item} badge={<AppStatusBadge status={appOf(item.id)} />} />
          </Animated.View>
        )}
        ListEmptyComponent={<Text style={[type.body, { paddingVertical: 30 }]}>Aucune campagne dans cette catégorie pour l'instant.</Text>}
      />

      <SectionHeader title="Marques qui recrutent" action="" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {recruiting.map(({ p, n }, i) => (
          <Animated.View key={p!.user_id} entering={FadeInDown.delay(i * 60).springify()}>
            <Press onPress={() => router.push(`/profile/${p!.user_id}`)} style={[styles.brand, shadow.soft]}>
              <Image source={avatarOf(p)} style={{ width: 52, height: 52, borderRadius: 18 }} />
              <Text style={[type.h3, { fontSize: 14 }]} numberOfLines={1}>
                {nameOf(p)}
              </Text>
              <Text style={type.tiny}>
                {flagOf(p!.country)} {n} offre{n > 1 ? "s" : ""}
              </Text>
            </Press>
          </Animated.View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

function BrandHome() {
  const insets = useSafeAreaInsets();
  const userId = useDB((s) => s.userId);
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const transactions = useDB((s) => s.transactions);
  const profiles = useDB((s) => s.profiles);

  const mine = useMemo(() => offers.filter((o) => o.brand_id === userId), [offers, userId]);
  const active = useMemo(() => mine.filter((o) => o.status === "active"), [mine]);
  const countFor = (id: string) => applications.filter((a) => a.offer_id === id).length;
  const totalApps = useMemo(() => applications.filter((a) => mine.some((o) => o.id === a.offer_id)).length, [applications, mine]);
  const spent = useMemo(() => {
    const d = new Date();
    return transactions
      .filter((t) => t.user_id === userId && t.type === "escrow" && new Date(t.created_at).getMonth() === d.getMonth() && new Date(t.created_at).getFullYear() === d.getFullYear())
      .reduce((a, t) => a + Math.abs(t.amount), 0);
  }, [transactions, userId]);
  const creators = useMemo(() => profiles.filter((p) => p.role === "creator" && !p.is_banned).slice(0, 8), [profiles]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
      <Header onBell={() => router.push("/notifications")} />

      <Animated.View entering={FadeInDown.delay(80).springify()} style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 20 }}>
        <StatTile icon="megaphone-outline" label="Offres actives" value={String(active.length)} />
        <StatTile icon="people-outline" label="Candidatures" value={String(totalApps)} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(130).springify()} style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <View style={[styles.spent, shadow.soft]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontWeight: "600" }}>Dépensé ce mois</Text>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: -0.6 }}>{fcfa(spent)}</Text>
          </View>
          <View style={styles.spentIcon}>
            <Ionicons name="wallet-outline" size={24} color={colors.primary} />
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify()} style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <Press onPress={() => router.push("/offer/edit")} style={[styles.cta, shadow.glow]} scaleTo={0.97}>
          <View style={styles.ctaIcon}>
            <Ionicons name="add" size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 17 }}>Créer une offre</Text>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Recevez des candidatures de créateurs</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color="#fff" />
        </Press>
      </Animated.View>

      <SectionHeader title="Mes offres actives" onAction={() => router.navigate("/(tabs)/offers")} />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        {active.length === 0 ? (
          <Empty icon="megaphone-outline" title="Aucune offre active" text="Publiez votre première offre pour recevoir des candidatures." />
        ) : (
          active.slice(0, 4).map((o, i) => (
            <Animated.View key={o.id} entering={FadeInDown.delay(i * 60).springify()}>
              <Press onPress={() => router.push(`/offer/${o.id}`)} style={[styles.offerRow, shadow.soft]} scaleTo={0.98}>
                <Image source={o.images[0] ?? "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=300&q=70"} style={{ width: 58, height: 58, borderRadius: 14 }} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.h3} numberOfLines={1}>
                    {o.title}
                  </Text>
                  <Text style={type.small}>{budgetLabel(o)}</Text>
                </View>
                <Badge label={`${countFor(o.id)} candidat${countFor(o.id) > 1 ? "s" : ""}`} tone="primary" />
              </Press>
            </Animated.View>
          ))
        )}
      </View>

      <SectionHeader title="Créateurs recommandés" onAction={() => router.push("/marketplace")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
        {creators.map((c, i) => (
          <Animated.View key={c.user_id} entering={FadeInDown.delay(i * 60).springify()}>
            <Press onPress={() => router.push(`/profile/${c.user_id}`)} style={[styles.creator, shadow.soft]} scaleTo={0.96}>
              <Image source={c.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={StyleSheet.absoluteFill} />
              <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
                  {c.full_name} {c.identity_verified ? "✓" : ""}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
                  {flagOf(c.country)} {c.category}
                </Text>
              </View>
            </Press>
          </Animated.View>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

export default function Home() {
  const me = useMe();
  return me?.role === "brand" ? <BrandHome /> : <CreatorHome />;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
  searchRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 18, marginBottom: 14 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 52, borderRadius: radius.pill, paddingHorizontal: 18, backgroundColor: "#F1E8E2" },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  filter: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  catIcon: { width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center" },
  catOn: { backgroundColor: colors.primary },
  catOff: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  catLabel: { fontSize: 13, color: colors.inkSoft, fontWeight: "500" },
  slide: { height: 200, borderRadius: radius.xl, overflow: "hidden", padding: 22, justifyContent: "space-between", backgroundColor: colors.night },
  slideTitle: { color: "#fff", fontSize: 24, lineHeight: 29, fontWeight: "800", maxWidth: 220, letterSpacing: -0.4 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dotBase: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D9CCC4" },
  dotOn: { width: 20, backgroundColor: colors.primary },
  brand: { width: 118, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: "center", gap: 6 },
  spent: { flexDirection: "row", alignItems: "center", backgroundColor: colors.night, borderRadius: radius.xl, padding: 20 },
  spentIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(255,90,54,0.18)", alignItems: "center", justifyContent: "center" },
  cta: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.primary, borderRadius: radius.xl, padding: 18 },
  ctaIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  offerRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, padding: 12, borderRadius: radius.lg },
  creator: { width: 150, height: 200, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.night },
});
