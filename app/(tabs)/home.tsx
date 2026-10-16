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
import { firstName as prenom, initials, shortName, totalFollowers } from "../../src/components/home/CreatorTile";
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
  BG_LOCATIONS,
  PAL,
  type Pal,
  ToneContext,
  setToneAndReload,
  useTone,
} from "../../src/appearance";
import type { Offer, Profile, SocialPlatform } from "../../src/types";
import { Logo, Press } from "../../src/ui";
import { SpaceSwitcher } from "../../src/components/SpaceSwitcher";
import { VerificationBanner, verifState } from "../../src/components/account/widgets";
import { AD_W, AdCard } from "../../src/components/offers/OfferCards";

const W = Dimensions.get("window").width;
const FEAT_W = Math.round(W * 0.8);
const FEAT_GAP = 12;
const FEAT_W_LIGHT = Math.round(W * 0.85);
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

const HERO_IMG = require("../../assets/creators/c8.jpg");

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
          size="sm"
          onPress={() => router.push(`/offer/${o.id}`)}
          style={{
            marginTop: 7,
            minWidth: 128,
          }}
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

// Mode clair : catégories populaires illustrées (ouvrent Explorer filtré).
const REMOTE = (id: string) => ({
  uri: `https://images.unsplash.com/${id}?w=480&q=75&auto=format&fit=crop`,
});
const POP_CATS: {
  title: string;
  sub?: string;
  cat: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  img: number | { uri: string };
}[] = [
  {
    title: "Beauté",
    sub: "& Bien-être",
    cat: "Beauté",
    icon: "lipstick",
    img: require("../../assets/brand/hero.jpg"),
  },
  {
    title: "Mode",
    sub: "& Accessoires",
    cat: "Mode",
    icon: "hanger",
    img: REMOTE("photo-1584917865442-de89df76afd3"),
  },
  {
    title: "Technologie",
    cat: "Tech",
    icon: "cellphone",
    img: REMOTE("photo-1511707171634-5f897ff02aa9"),
  },
  {
    title: "Cuisine",
    sub: "& Gastronomie",
    cat: "Cuisine",
    icon: "silverware-fork-knife",
    img: REMOTE("photo-1504674900247-0877df9cc836"),
  },
  {
    title: "Fitness",
    sub: "& Sport",
    cat: "Fitness",
    icon: "dumbbell",
    img: REMOTE("photo-1517836357463-d25dfeac3438"),
  },
  {
    title: "Lifestyle",
    cat: "Lifestyle",
    icon: "coffee-outline",
    img: require("../../assets/profile/p5.jpg"),
  },
];

function CategoryTiles() {
  const tone = useTone();
  const styles = STYLES[tone];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={170 + 12}
      decelerationRate="fast"
      contentContainerStyle={{
        paddingHorizontal: 16,
        gap: 12,
        paddingBottom: 10,
      }}
    >
      {POP_CATS.map((c, i) => (
        <Animated.View
          key={c.cat}
          entering={FadeInRight.delay(260 + i * 60).duration(320)}
        >
          <Press
            onPress={() =>
              router.push(
                `/(tabs)/offers?tab=offers&cat=${encodeURIComponent(c.cat)}`,
              )
            }
            style={[styles.catTile, shadowOf(PAL[tone])]}
            scaleTo={0.97}
          >
            <LinearGradient
              colors={["#E8BBA8", "#B97055"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <MaterialCommunityIcons
              name={c.icon}
              size={46}
              color="rgba(255,248,243,0.35)"
              style={{ position: "absolute", right: 14, top: 14 }}
            />
            <Image
              source={c.img}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
            />
            <LinearGradient
              colors={[
                "rgba(48,32,28,0.62)",
                "rgba(48,32,28,0.15)",
                "rgba(48,32,28,0.05)",
              ]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.catTileBody}>
              <Text style={styles.catTileTitle} numberOfLines={1}>
                {c.title}
              </Text>
              {c.sub ? (
                <Text style={styles.catTileSub} numberOfLines={1}>
                  {c.sub}
                </Text>
              ) : null}
              <View style={styles.catTileArrow}>
                <Ionicons name="arrow-forward" size={13} color="#FFF8F3" />
              </View>
            </View>
          </Press>
        </Animated.View>
      ))}
    </ScrollView>
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
  const tone = useTone();
  const toggleTone = () => void setToneAndReload(tone === "light" ? "dark" : "light");
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
      : prenom(me.full_name);
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
      <CategoryTiles />
    </>
  );

  return (
    <ToneContext.Provider value={tone}>
      <LinearGradient
        colors={t.bgGrad}
        locations={BG_LOCATIONS[tone]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 0,
          paddingBottom: 150,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reflet doré d'ambiance en haut à droite */}


          <Animated.View
            entering={FadeIn.duration(500)}
            style={[styles.hero, { paddingTop: insets.top + 8 }]}
          >
            <Image
              source={HERO_IMG}
              style={styles.heroImg}
              contentFit="cover"
              contentPosition="top"
            />
            <LinearGradient
              colors={[
                "rgba(48,32,28,0.78)",
                "rgba(48,32,28,0.45)",
                "rgba(48,32,28,0)",
              ]}
              locations={[0, 0.45, 0.85]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={["rgba(255,228,205,0.18)", "rgba(166,95,70,0.12)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTop}>
              <Logo size={40} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Press
                  onPress={toggleTone}
                  style={styles.heroBtn}
                  scaleTo={0.9}
                  accessibilityLabel={tone === "light" ? "Mode sombre" : "Mode clair"}
                >
                  <Ionicons name={tone === "light" ? "moon-outline" : "sunny-outline"} size={20} color="#FFF8F3" />
                </Press>
                <Press
                  onPress={() =>
                    router.push(me ? "/notifications" : "/auth/signup")
                  }
                  style={styles.heroBtn}
                  scaleTo={0.9}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color="#FFF8F3"
                  />
                  {unread && <View style={styles.bellDot} />}
                </Press>
              </View>
            </View>
            <View style={styles.heroBody}>
              <Text style={styles.heroHello} numberOfLines={1}>
                Bonjour {firstName} 👋
              </Text>
              <Text style={styles.heroSub} numberOfLines={2}>
                {!me
                  ? "Découvre des créateurs incroyables. Crée ton compte pour collaborer."
                  : brandSpace
                    ? "Trouve les créateurs idéaux pour ta marque."
                    : "Découvre les offres des marques et collabore avec elles."}
              </Text>
              <GoldButton
                label={
                  brandSpace ? "Explorer les créateurs" : "Explorer les offres"
                }
                onPress={() =>
                  router.push(
                    brandSpace ? "/marketplace" : "/(tabs)/offers?tab=offers",
                  )
                }
                style={{ marginTop: 14, minWidth: 190 }}
              />
              <View style={{ marginTop: 12 }}>
                <SpaceSwitcher />
              </View>
            </View>
          </Animated.View>

        {/* Compte pas encore vérifié : invitation bien visible dès l'accueil (scan du visage + pièce). */}
        {me && verifState(me) !== "verified" ? (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <VerificationBanner p={me} />
          </View>
        ) : null}


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
                  snapToInterval={
                    FEAT_W_LIGHT + FEAT_GAP
                  }
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    gap: FEAT_GAP,
                  }}
                  onScroll={(e) =>
                    setPage(
                      Math.round(
                        e.nativeEvent.contentOffset.x /
                          (FEAT_W_LIGHT +
                            FEAT_GAP),
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
                  snapToInterval={
                    FEAT_W_LIGHT + FEAT_GAP
                  }
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: 16,
                    gap: FEAT_GAP,
                  }}
                  onScroll={(e) =>
                    setPage(
                      Math.round(
                        e.nativeEvent.contentOffset.x /
                          (FEAT_W_LIGHT +
                            FEAT_GAP),
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

const makeStyles = (t: Pal, light = false) =>
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
      fontSize: light ? 15 : 18,
      lineHeight: light ? 18 : 22,
      marginTop: light ? 6 : 8,
      maxWidth: "58%",
    },
    offerBudget: {
      color: t.primary,
      fontSize: light ? 12 : 13,
      fontWeight: "800",
      marginTop: light ? 5 : 8,
    },
    offerApps: { color: t.inkSoft, fontSize: 10, marginTop: 2 },
    ambient: { position: "absolute", top: 0, right: 0, width: W, height: 360 },
    catTile: {
      width: 170,
      height: 115,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,248,243,0.6)",
      backgroundColor: "#E8BBA8",
    },
    catTileBody: {
      position: "absolute",
      left: 14,
      top: 14,
      bottom: 12,
      right: 12,
    },
    catTileTitle: {
      fontFamily: fonts.serif,
      color: "#FFF8F3",
      fontSize: 17,
      lineHeight: 21,
    },
    catTileSub: {
      fontFamily: fonts.serif,
      color: "#FFF8F3",
      fontSize: 14,
      lineHeight: 18,
      opacity: 0.95,
    },
    catTileArrow: {
      position: "absolute",
      left: 0,
      bottom: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: "rgba(255,248,243,0.7)",
      backgroundColor: "rgba(48,32,28,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    hero: {
      height: Math.round(W * 0.66) + 90,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      overflow: "hidden",
      paddingHorizontal: 18,
      backgroundColor: "#3A2620",
    },
    heroImg: {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: "68%",
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(48,32,28,0.35)",
      borderWidth: 1,
      borderColor: "rgba(255,248,243,0.35)",
    },
    heroBody: {
      flex: 1,
      justifyContent: "flex-end",
      paddingBottom: 22,
      maxWidth: "70%",
    },
    heroHello: {
      fontFamily: fonts.serif,
      color: "#FFF8F3",
      fontSize: 27,
      lineHeight: 32,
    },
    heroSub: {
      color: "rgba(255,248,243,0.9)",
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
    },
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
      width: light ? FEAT_W_LIGHT : FEAT_W,
      height: light ? 200 : 240,
      borderRadius: light ? 22 : radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: t.borderStrong,
      backgroundColor: t.card,
    },
    featBody: light
      ? { position: "absolute", left: 16, top: 14, right: 16 }
      : { position: "absolute", left: 16, bottom: 16, right: 16 },
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
const STYLES = {
  dark: makeStyles(PAL.dark, true),
  light: makeStyles(PAL.light, true),
};

export default function Home() {
  dbg("3. accueil : rendu");
  const role = useDB(
    (s) => s.profiles.find((p) => p.user_id === s.userId)?.role,
  );
  return <CreatorHome key={role} brandSpace={role === "brand"} />;
}
