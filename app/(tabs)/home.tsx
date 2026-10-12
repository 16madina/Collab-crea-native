// Accueil Créateur : nouvelles offres des marques en tête, puis les créateurs populaires.
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { dbg } from "../../src/debug";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ALL_PLATFORMS,
  formatFollowers,
  parseFollowers,
  PLATFORM,
} from "../../src/components/account/constants";
import { avatarOf, flagOf, nameOf } from "../../src/components/collab/common";
import {
  initials,
  shortName,
  totalFollowers,
} from "../../src/components/home/CreatorTile";
import { Empty } from "../../src/kit";
import {
  GlossFill,
  GoldButton,
  GoldFill,
  GoldPill,
  GoldRing,
  GoldText,
  goldGlow,
  luxShadow,
} from "../../src/lux";
import { budgetLabel, useDB, useMe } from "../../src/store";
import { mixRealDemo } from "../../src/mix";
import { timeLeft } from "../../src/kit";
import { fonts, radius } from "../../src/theme";
import {
  PAL,
  type Pal,
  ToneContext,
  useAppearance,
  useTone,
} from "../../src/appearance";
import type { Offer, Profile, SocialPlatform } from "../../src/types";
import { Logo, Press } from "../../src/ui";
import { SpaceSwitcher } from "../../src/components/SpaceSwitcher";
import { AD_W, AdCard } from "../../src/components/offers/OfferCards";

const W = Dimensions.get("window").width;
const FEAT_W = Math.round(W * 0.8);
const FEAT_GAP = 12;
const NEW_W = Math.round((W - 32 - 2 * 10) / 2.4);

const CATS: {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: "Tous", label: "Toutes", icon: "dots-grid" },
  { key: "Beauté", label: "Beauté", icon: "lipstick" },
  { key: "Mode", label: "Mode", icon: "tshirt-crew-outline" },
  { key: "Tech", label: "Tech", icon: "cellphone" },
  { key: "Cuisine", label: "Cuisine", icon: "silverware-fork-knife" },
  { key: "Fitness", label: "Fitness", icon: "dumbbell" },
  { key: "Lifestyle", label: "Lifestyle", icon: "coffee-outline" },
  { key: "Humour", label: "Humour", icon: "emoticon-happy-outline" },
];

const shadowOf = (t: Pal) => ({
  ...luxShadow,
  shadowColor: t.shadow,
  shadowOpacity: t.shadowOpacity,
});

const tagsOf = (p: Profile) =>
  [p.category, ...(p.tags ?? [])].filter(Boolean) as string[];

function Heart({ p }: { p: Profile }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  const favorites = useDB((s) => s.favorites);
  const userId = useDB((s) => s.userId);
  const isBrand = useDB(
    (s) => s.profiles.find((x) => x.user_id === s.userId)?.role === "brand",
  );
  const toggleFavorite = useDB((s) => s.toggleFavorite);
  const fav = favorites.some(
    (f) => f.brand_id === userId && f.creator_id === p.user_id,
  );
  return (
    <Press
      onPress={() =>
        !userId
          ? router.push("/auth/signup")
          : isBrand
            ? toggleFavorite(p.user_id)
            : router.push(`/profile/${p.user_id}`)
      }
      style={styles.heart}
      scaleTo={0.8}
      hitSlop={8}
    >
      <Ionicons
        name={fav ? "heart" : "heart-outline"}
        size={18}
        color={fav ? t.primary : t.heartIcon}
      />
    </Press>
  );
}

function Photo({
  p,
  mono,
  side,
}: {
  p: Profile;
  mono: number;
  side?: boolean;
}) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  return (
    <>
      <View style={[styles.mono, side && styles.side]}>
        <Text style={[styles.monoText, { fontSize: mono }]}>
          {initials(p.full_name)}
        </Text>
      </View>
      <Image
        source={p.avatar_url}
        style={side ? styles.side : StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={300}
      />
    </>
  );
}

function Tag({ label }: { label: string }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function FeaturedCard({ p }: { p: Profile }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  return (
    <Press
      onPress={() => router.push(`/profile/${p.user_id}`)}
      style={[styles.feat, shadowOf(t)]}
      scaleTo={0.98}
    >
      <Photo p={p} mono={90} side />
      <LinearGradient
        colors={[`${t.cardFade}1)`, `${t.cardFade}0.6)`, `${t.cardFade}0)`]}
        locations={[0.3, 0.5, 0.7]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[`${t.cardFade}0)`, `${t.cardFade}0.75)`]}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Heart p={p} />
      <View style={styles.featBody}>
        <View style={styles.nameRow}>
          <Text style={styles.featName} numberOfLines={1}>
            {shortName(p.full_name)}
          </Text>
          {p.identity_verified && (
            <Ionicons name="checkmark-circle" size={20} color={t.primary} />
          )}
        </View>
        <Text style={styles.featFollowers}>
          {formatFollowers(totalFollowers(p))} abonnés
        </Text>
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          {tagsOf(p)
            .slice(0, 3)
            .map((t) => (
              <Tag key={t} label={t} />
            ))}
        </View>
        <GoldButton
          label="Voir le profil"
          onPress={() => router.push(`/profile/${p.user_id}`)}
          style={{ marginTop: 12, minWidth: 170 }}
        />
      </View>
    </Press>
  );
}

function OfferFeatured({
  o,
  brand,
  apps,
}: {
  o: Offer;
  brand?: Profile;
  apps: number;
}) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  const img = o.images?.[0];
  return (
    <Press
      onPress={() => router.push(`/offer/${o.id}`)}
      style={[styles.feat, shadowOf(t)]}
      scaleTo={0.98}
    >
      {img != null ? (
        <Image
          source={typeof img === "string" ? { uri: img } : img}
          style={styles.offerImg}
          contentFit="cover"
        />
      ) : (
        <GlossFill />
      )}
      <LinearGradient
        colors={[`${t.cardFade}1)`, `${t.cardFade}0.6)`, `${t.cardFade}0)`]}
        locations={[0.3, 0.5, 0.75]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featBody}>
        <View style={styles.offerBrand}>
          <View style={styles.offerLogo}>
            <Text style={styles.offerLogoText}>
              {nameOf(brand).slice(0, 2).toUpperCase()}
            </Text>
            <Image
              source={avatarOf(brand)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          </View>
          <Text style={styles.offerBrandName} numberOfLines={1}>
            {nameOf(brand)}
          </Text>
          {brand?.identity_verified && (
            <Ionicons name="checkmark-circle" size={14} color={t.primary} />
          )}
        </View>
        <Text style={styles.offerTitle} numberOfLines={2}>
          {o.title}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
          <Tag label={o.category} />
          {o.deadline ? <Tag label={timeLeft(o.deadline).label} /> : null}
        </View>
        <Text style={styles.offerBudget} numberOfLines={1}>
          {budgetLabel(o)}
        </Text>
        <Text style={styles.offerApps}>
          {apps} candidature{apps > 1 ? "s" : ""}
        </Text>
        <GoldButton
          label="Voir l'offre"
          onPress={() => router.push(`/offer/${o.id}`)}
          style={{ marginTop: 10, minWidth: 150 }}
        />
      </View>
    </Press>
  );
}

function NewCard({ p }: { p: Profile }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  return (
    <Press
      onPress={() => router.push(`/profile/${p.user_id}`)}
      style={[styles.newCard, shadowOf(t)]}
      scaleTo={0.96}
    >
      <GlossFill />
      <View style={{ height: NEW_W * 1.1 }}>
        <Photo p={p} mono={40} />
        <Heart p={p} />
      </View>
      <View style={styles.newBody}>
        <View style={styles.nameRow}>
          <Text style={styles.newName} numberOfLines={1}>
            {shortName(p.full_name)}
          </Text>
          {p.identity_verified && (
            <Ionicons name="checkmark-circle" size={14} color={t.primary} />
          )}
        </View>
        <View style={styles.newMeta}>
          <Ionicons name="people-outline" size={12} color={t.inkSoft} />
          <Text style={styles.newFollowers}>
            {formatFollowers(totalFollowers(p))}
          </Text>
          <Text style={styles.newFlag}>
            {flagOf(p.country ?? p.residence_country)}
          </Text>
        </View>
        <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
          <Tag label={p.category || "Créateur"} />
        </View>
      </View>
    </Press>
  );
}

function PagerDots({ count, index }: { count: number; index: number }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <PagerDot key={i} on={i === index} />
      ))}
    </View>
  );
}
function PagerDot({ on }: { on: boolean }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  const st = useAnimatedStyle(() => ({
    width: withTiming(on ? 18 : 7, { duration: 200 }),
    opacity: withTiming(on ? 1 : 0.35, { duration: 200 }),
  }));
  return (
    <Animated.View
      style={[styles.dot, on && { backgroundColor: t.primary }, st]}
    />
  );
}

function SectionHead({ title, onAll }: { title: string; onAll: () => void }) {
  const tone = useTone();
  const t = PAL[tone];
  const styles = STYLES[tone];
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Press
        onPress={onAll}
        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
      >
        <Text style={styles.seeAll}>Voir tout</Text>
        <Ionicons name="arrow-forward" size={15} color={t.primary} />
      </Press>
    </View>
  );
}

function CreatorHome({ brandSpace = false }: { brandSpace?: boolean }) {
  const tone = useAppearance((s) => s.home);
  const toggleTone = useAppearance((s) => s.toggleHome);
  const t = PAL[tone];
  const styles = STYLES[tone];
  dbg("5. accueil (contenu) : rendu");
  useEffect(() => {
    dbg("6. accueil affiché ✅");
  }, []);
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
  const [page, setPage] = useState(0);
  const searchRef = useRef<TextInput>(null);

  const unread = useMemo(
    () => notifications.some((n) => n.user_id === userId && !n.is_read),
    [notifications, userId],
  );
  const creators = useMemo(
    () =>
      profiles.filter(
        (p) => p.role === "creator" && !p.is_banned && p.user_id !== userId,
      ),
    [profiles, userId],
  );
  const countries = useMemo(
    () =>
      Array.from(
        new Set(creators.map((c) => c.country).filter(Boolean)),
      ) as string[],
    [creators],
  );
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return creators.filter(
      (p) =>
        (cat === "Tous" || p.category === cat || p.tags?.includes(cat)) &&
        (country === "all" || p.country === country) &&
        (platform === "all" || parseFollowers(p.followers[platform]) > 0) &&
        (!s ||
          `${p.full_name} ${p.category} ${p.tags?.join(" ")} ${p.country}`
            .toLowerCase()
            .includes(s)),
    );
  }, [creators, q, cat, country, platform]);
  const offers = useDB((s) => s.offers);
  const applications = useDB((s) => s.applications);
  const newOffers = useMemo(() => {
    const s = q.trim().toLowerCase();
    return offers
      .filter(
        (o) =>
          o.status === "active" &&
          (!o.deadline || new Date(o.deadline).getTime() > Date.now()),
      )
      .filter((o) => cat === "Tous" || o.category === cat)
      .filter(
        (o) =>
          !s ||
          `${o.title} ${o.category} ${o.description}`.toLowerCase().includes(s),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8);
  }, [offers, q, cat]);
  const popularOffers = useMemo(() => {
    const count = (id: string) =>
      applications.filter((x) => x.offer_id === id).length;
    return offers
      .filter(
        (o) => o.status === "active" && (cat === "Tous" || o.category === cat),
      )
      .sort((a, b) => count(b.id) - count(a.id))
      .slice(0, 8);
  }, [offers, applications, cat]);
  const recommended = useMemo(() => {
    const myCat = me?.sector ?? me?.category;
    return mixRealDemo(
      [...filtered].sort(
        (a, b) =>
          Number(b.category === myCat) - Number(a.category === myCat) ||
          Number(!!b.identity_verified) - Number(!!a.identity_verified) ||
          totalFollowers(b) - totalFollowers(a),
      ),
    ).slice(0, 6);
  }, [filtered, me]);
  const popular = useMemo(
    () =>
      mixRealDemo(
        [...filtered].sort((a, b) => totalFollowers(b) - totalFollowers(a)),
      ),
    [filtered],
  );
  const activeFilters =
    (country !== "all" ? 1 : 0) + (platform !== "all" ? 1 : 0);
  const isBrand = me?.role === "brand";
  const firstName = !me
    ? "Invité"
    : isBrand
      ? nameOf(me)
      : me.full_name.split(" ")[0];
  const seeAll = () => router.push("/marketplace");

  const premiumAds = (
    <>
      <View style={styles.adHead}>
        <MaterialCommunityIcons
          name="bullhorn-outline"
          size={24}
          color={t.primary}
          style={{ marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          {/* Mots côte à côte : un GoldText (MaskedView) imbriqué dans un <Text> fait planter iOS. */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <Text style={styles.adHeadTitle}>Annonces </Text>
            <GoldText style={styles.adHeadTitle}>populaires</GoldText>
          </View>
          <Text style={styles.adHeadSub}>
            Découvrez les dernières campagnes publiées par les marques.
          </Text>
        </View>
        <Press
          onPress={() => router.push("/(tabs)/offers?tab=offers")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <Text style={styles.seeAll}>Voir tout</Text>
          <Ionicons name="arrow-forward" size={14} color={t.primary} />
        </Press>
      </View>
      {popularOffers.length === 0 ? (
        <Empty
          icon="megaphone-outline"
          title="Aucune annonce"
          text="Essaie une autre catégorie."
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={AD_W + 14}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 14,
            paddingBottom: 10,
          }}
        >
          {popularOffers.map((o, i) => (
            <Animated.View
              key={o.id}
              entering={FadeInRight.delay(260 + i * 60).duration(320)}
            >
              <AdCard
                o={o}
                brand={profiles.find((p) => p.user_id === o.brand_id)}
                apps={applications.filter((x) => x.offer_id === o.id).length}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </>
  );

  return (
    <ToneContext.Provider value={tone}>
      <LinearGradient colors={t.bgGrad} style={StyleSheet.absoluteFill} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 6,
          paddingBottom: 150,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reflet doré d'ambiance en haut à droite */}
        <LinearGradient
          colors={[
            `${t.ambient}${tone === "light" ? 0.7 : 0.16})`,
            `${t.ambient}0)`,
          ]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.3, y: 0.6 }}
          style={styles.ambient}
          pointerEvents="none"
        />

        {/* Barre du haut */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.topBar}>
          <View style={{ gap: 10 }}>
            <Logo size={40} />
            <SpaceSwitcher />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
            }}
          >
            <Press
              onPress={toggleTone}
              style={styles.iconBtn}
              scaleTo={0.9}
              accessibilityLabel={
                tone === "light" ? "Mode sombre" : "Mode clair"
              }
            >
              <Ionicons
                name={tone === "light" ? "moon-outline" : "sunny-outline"}
                size={22}
                color={t.ink}
              />
            </Press>
            <Press
              onPress={() =>
                router.push(me ? "/notifications" : "/auth/signup")
              }
              style={styles.iconBtn}
              scaleTo={0.9}
            >
              <Ionicons name="notifications-outline" size={23} color={t.ink} />
              {unread && <View style={styles.bellDot} />}
            </Press>
            <Press
              onPress={() => searchRef.current?.focus()}
              style={[styles.iconBtn, styles.iconBtnRing]}
              scaleTo={0.9}
            >
              <Ionicons name="search-outline" size={21} color={t.ink} />
            </Press>
          </View>
        </Animated.View>

        {/* Salutation */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(320)}
          style={styles.greet}
        >
          <Press
            onPress={() =>
              router.navigate(me ? "/(tabs)/profile" : "/auth/signup")
            }
            scaleTo={0.92}
          >
            <GoldRing size={60}>
              {me ? (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: t.card,
                  }}
                >
                  <Text style={[styles.offerLogoText, { fontSize: 18 }]}>
                    {initials(nameOf(me))}
                  </Text>
                  <Image
                    source={avatarOf(me)}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                </View>
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={28} color={t.primary} />
                </View>
              )}
            </GoldRing>
          </Press>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello} numberOfLines={1}>
              Bonjour {firstName} 👋
            </Text>
            <Text style={styles.sub} numberOfLines={2}>
              {!me
                ? "Découvre des créateurs incroyables. Crée ton compte pour collaborer."
                : brandSpace
                  ? "Trouve les créateurs idéaux pour ta marque."
                  : "Découvre les offres des marques et collabore avec elles."}
            </Text>
          </View>
        </Animated.View>

        {/* Recherche */}
        <Animated.View
          entering={FadeInDown.delay(140).duration(320)}
          style={styles.searchRow}
        >
          <View style={styles.search}>
            <GlossFill />
            <Ionicons name="search-outline" size={20} color={t.inkSoft} />
            <TextInput
              ref={searchRef}
              value={q}
              onChangeText={setQ}
              placeholder="Rechercher un créateur, une marque…"
              placeholderTextColor={t.muted}
              style={styles.input}
            />
          </View>
          <Press
            onPress={() => setShowFilters((v) => !v)}
            style={[
              styles.filterBtn,
              (showFilters || activeFilters > 0) && [styles.filterOn, goldGlow],
            ]}
            scaleTo={0.9}
          >
            {showFilters || activeFilters > 0 ? (
              <GoldFill style={{ borderRadius: 26 }} />
            ) : (
              <GlossFill style={{ borderRadius: 26 }} />
            )}
            <Ionicons
              name="options-outline"
              size={22}
              color={showFilters || activeFilters > 0 ? t.onPrimary : t.ink}
            />
          </Press>
        </Animated.View>

        {showFilters && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{ gap: 10, marginTop: 14 }}
          >
            <Text style={styles.filterLabel}>Pays</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {["all", ...countries].map((c) => (
                <GoldPill
                  key={c}
                  label={c === "all" ? "Tous les pays" : `${flagOf(c)} ${c}`}
                  on={country === c}
                  onPress={() => setCountry(c)}
                />
              ))}
            </ScrollView>
            <Text style={styles.filterLabel}>Plateforme</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              <GoldPill
                label="Toutes"
                on={platform === "all"}
                onPress={() => setPlatform("all")}
              />
              {ALL_PLATFORMS.map((p) => (
                <GoldPill
                  key={p}
                  label={PLATFORM[p].label}
                  icon={PLATFORM[p].icon}
                  on={platform === p}
                  onPress={() => setPlatform(p)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Catégories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 12,
            paddingTop: 18,
            paddingBottom: 4,
          }}
        >
          {CATS.map((c, i) => {
            const on = c.key === cat;
            return (
              <Animated.View
                key={c.key}
                entering={FadeInDown.delay(180 + i * 40).duration(320)}
              >
                <Press
                  onPress={() => setCat(c.key)}
                  style={{ alignItems: "center", gap: 7 }}
                  scaleTo={0.9}
                >
                  <View style={[styles.catBox, on ? goldGlow : null]}>
                    {on ? (
                      <GoldFill style={{ borderRadius: 18 }} />
                    ) : (
                      <GlossFill style={{ borderRadius: 18 }} />
                    )}
                    <MaterialCommunityIcons
                      name={c.icon}
                      size={26}
                      color={on ? t.onPrimary : t.ink}
                    />
                  </View>
                  <Text
                    style={[
                      styles.catLabel,
                      on && { color: t.ink, fontWeight: "700" },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Press>
              </Animated.View>
            );
          })}
        </ScrollView>

        {brandSpace ? (
          <>
            {/* Créateurs recommandés */}
            <SectionHead title="Créateurs recommandés" onAll={seeAll} />
            {recommended.length === 0 ? (
              <Empty
                icon="people-outline"
                title="Aucun créateur trouvé"
                text="Essaie une autre catégorie, un autre pays ou une autre plateforme."
              />
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={FEAT_W + FEAT_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    gap: FEAT_GAP,
                  }}
                  onScroll={(e) =>
                    setPage(
                      Math.round(
                        e.nativeEvent.contentOffset.x / (FEAT_W + FEAT_GAP),
                      ),
                    )
                  }
                  scrollEventThrottle={32}
                >
                  {recommended.map((p, i) => (
                    <Animated.View
                      key={p.user_id}
                      entering={FadeInRight.delay(220 + i * 80).duration(320)}
                    >
                      <FeaturedCard p={p} />
                    </Animated.View>
                  ))}
                </ScrollView>
                <PagerDots
                  count={recommended.length}
                  index={Math.min(page, recommended.length - 1)}
                />
              </>
            )}
          </>
        ) : (
          <>
            {/* Nouvelles offres des marques */}
            <SectionHead
              title="Nouvelles offres"
              onAll={() => router.push("/(tabs)/offers?tab=offers")}
            />
            {newOffers.length === 0 ? (
              <Empty
                icon="briefcase-outline"
                title="Aucune offre pour l'instant"
                text="Reviens bientôt ou essaie une autre catégorie."
              />
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={FEAT_W + FEAT_GAP}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    gap: FEAT_GAP,
                  }}
                  onScroll={(e) =>
                    setPage(
                      Math.round(
                        e.nativeEvent.contentOffset.x / (FEAT_W + FEAT_GAP),
                      ),
                    )
                  }
                  scrollEventThrottle={32}
                >
                  {newOffers.map((o, i) => (
                    <Animated.View
                      key={o.id}
                      entering={FadeInRight.delay(220 + i * 80).duration(320)}
                    >
                      <OfferFeatured
                        o={o}
                        brand={profiles.find((p) => p.user_id === o.brand_id)}
                        apps={
                          applications.filter((x) => x.offer_id === o.id).length
                        }
                      />
                    </Animated.View>
                  ))}
                </ScrollView>
                <PagerDots
                  count={newOffers.length}
                  index={Math.min(page, newOffers.length - 1)}
                />
              </>
            )}
          </>
        )}

        {/* Créateurs populaires */}
        <SectionHead title="Créateurs populaires" onAll={seeAll} />
        {popular.length === 0 ? (
          <Empty
            icon="people-outline"
            title="Aucun créateur trouvé"
            text="Essaie une autre catégorie, un autre pays ou une autre plateforme."
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 10,
              paddingBottom: 6,
            }}
          >
            {popular.map((p, i) => (
              <Animated.View
                key={p.user_id}
                entering={FadeInRight.delay(300 + i * 60).duration(320)}
              >
                <NewCard p={p} />
              </Animated.View>
            ))}
          </ScrollView>
        )}

        {premiumAds}
      </ScrollView>
    </ToneContext.Provider>
  );
}

const makeStyles = (t: Pal) =>
  StyleSheet.create({
    adHead: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 16,
      marginTop: 14,
      marginBottom: 12,
    },
    adHeadTitle: {
      fontFamily: fonts.serif,
      color: t.title,
      fontSize: 20,
      lineHeight: 25,
    },
    adHeadSub: { color: t.inkSoft, fontSize: 11, marginTop: 2 },
    offerImg: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: "62%",
    },
    offerBrand: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      maxWidth: "62%",
    },
    offerLogo: {
      width: 26,
      height: 26,
      borderRadius: 13,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.card,
      alignItems: "center",
      justifyContent: "center",
    },
    offerLogoText: { fontFamily: fonts.serif, color: t.monoText, fontSize: 10 },
    offerBrandName: {
      color: t.inkSoft,
      fontSize: 11,
      fontWeight: "700",
      flexShrink: 1,
    },
    offerTitle: {
      fontFamily: fonts.serif,
      color: t.ink,
      fontSize: 18,
      lineHeight: 22,
      marginTop: 8,
      maxWidth: "62%",
    },
    offerBudget: {
      color: t.primary,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 8,
    },
    offerApps: { color: t.inkSoft, fontSize: 10, marginTop: 2 },
    ambient: { position: "absolute", top: 0, right: 0, width: W, height: 360 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    iconBtn: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnRing: {
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.ringBg,
    },
    bellDot: {
      position: "absolute",
      top: 9,
      right: 11,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: t.primary,
      borderWidth: 1.5,
      borderColor: t.bg,
    },
    greet: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      marginTop: 16,
    },
    hello: { color: t.ink, fontSize: 18, fontWeight: "700" },
    sub: { color: t.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 2 },
    searchRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      marginTop: 18,
    },
    search: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      height: 52,
      borderRadius: radius.pill,
      paddingHorizontal: 18,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.border,
    },
    input: { flex: 1, minWidth: 0, fontSize: 12, color: t.ink, zIndex: 1 },
    filterBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      borderColor: t.border,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    filterOn: { borderColor: "transparent" },
    filterLabel: {
      color: t.muted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      paddingHorizontal: 16,
    },
    pillRow: { paddingHorizontal: 16, gap: 8 },
    catBox: {
      width: 62,
      height: 62,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.border,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    catLabel: { color: t.inkSoft, fontSize: 11, fontWeight: "500" },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginTop: 24,
      marginBottom: 12,
    },
    sectionTitle: { color: t.ink, fontSize: 17, fontWeight: "700" },
    seeAll: { color: t.primary, fontWeight: "600", fontSize: 12 },
    mono: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.mono,
    },
    side: { position: "absolute", top: 0, bottom: 0, right: 0, width: "62%" },
    monoText: { fontFamily: fonts.serif, color: t.monoText, opacity: 0.85 },
    heart: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: t.heartBg,
      borderWidth: 1,
      borderColor: t.heartBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    feat: {
      width: FEAT_W,
      height: 240,
      borderRadius: radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.borderStrong,
      backgroundColor: t.card,
    },
    featBody: { position: "absolute", left: 16, bottom: 16, right: 16 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    featName: { color: t.ink, fontSize: 21, fontWeight: "800", flexShrink: 1 },
    featFollowers: { color: t.inkSoft, fontSize: 12, marginTop: 2 },
    tag: {
      backgroundColor: t.tagBg,
      borderWidth: 1,
      borderColor: t.tagBorder,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: { color: t.ink, fontSize: 10, fontWeight: "600" },
    dots: {
      flexDirection: "row",
      gap: 6,
      justifyContent: "center",
      marginTop: 14,
    },
    dot: { height: 7, borderRadius: 4, backgroundColor: t.inkSoft },
    newCard: {
      width: NEW_W,
      borderRadius: radius.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: t.card,
    },
    newName: { color: t.ink, fontSize: 13, fontWeight: "700", flexShrink: 1 },
    newBody: { padding: 10, gap: 3, height: 84 },
    newMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
    newFlag: { fontSize: 13, marginLeft: "auto" },
    newFollowers: { color: t.inkSoft, fontSize: 12 },
  });
const STYLES = { dark: makeStyles(PAL.dark), light: makeStyles(PAL.light) };

export default function Home() {
  dbg("3. accueil : rendu");
  const role = useDB(
    (s) => s.profiles.find((p) => p.user_id === s.userId)?.role,
  );
  return <CreatorHome key={role} brandSpace={role === "brand"} />;
}
