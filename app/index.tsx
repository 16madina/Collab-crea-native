// Onboarding en 4 écrans (maquette Noir & Or) — point d'entrée des visiteurs.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GoldFill, GoldText, goldBorder, goldGlow } from "../src/lux";
import { useDB } from "../src/store";
import { colors, fonts, radius, type } from "../src/theme";
import { Role } from "../src/types";
import { Press } from "../src/ui";

const { width: W, height: H } = Dimensions.get("window");
const IMG = {
  hero: require("../assets/onboarding/hero.jpg"),
  logo: require("../assets/onboarding/logo.png"),
  profile: require("../assets/onboarding/profile.jpg"),
  campaigns: require("../assets/onboarding/campaigns.jpg"),
  community: require("../assets/onboarding/community.jpg"),
};

type Feature = { icon: keyof typeof Ionicons.glyphMap; label: string };
const SLIDES: { key: string; body: string; image?: number; features?: Feature[]; cta: string }[] = [
  { key: "welcome", body: "", cta: "" },
  {
    key: "profile",
    body: "Présente ton univers, tes réseaux et tes statistiques en quelques étapes seulement.",
    image: IMG.profile,
    cta: "Suivant",
  },
  {
    key: "collab",
    body: "Accède à des campagnes authentiques et rémunérées qui correspondent à ton univers.",
    image: IMG.campaigns,
    features: [
      { icon: "cash-outline", label: "Des revenus\nréels" },
      { icon: "people-outline", label: "Des marques\nsérieuses" },
      { icon: "stats-chart-outline", label: "Une communauté\nactive" },
    ],
    cta: "Suivant",
  },
  {
    key: "grow",
    body: "Des créateurs, des marques et des opportunités, réunis au même endroit.",
    image: IMG.community,
    features: [
      { icon: "people", label: "Une communauté\nde talents" },
      { icon: "star", label: "Des collaborations\nde qualité" },
      { icon: "trending-up", label: "Une vraie\ncroissance" },
    ],
    cta: "Commencer maintenant",
  },
];

function GoldCta({ label, onPress, icon = "arrow-forward", wide }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; wide?: boolean }) {
  return (
    <Press onPress={onPress} style={[styles.cta, goldGlow, wide && { alignSelf: "stretch" }]} scaleTo={0.96}>
      <GoldFill style={{ borderRadius: radius.pill }} />
      <Text style={styles.ctaText}>{label}</Text>
      <Ionicons name={icon} size={20} color={colors.onPrimary} />
    </Press>
  );
}

function Dots({ i }: { i: number }) {
  return (
    <View style={styles.dots}>
      {SLIDES.map((_, k) => (
        <Dot key={k} on={k === i} />
      ))}
    </View>
  );
}
function Dot({ on }: { on: boolean }) {
  const st = useAnimatedStyle(() => ({ width: withSpring(on ? 10 : 8), opacity: withSpring(on ? 1 : 0.35) }));
  return <Animated.View style={[styles.dot, on && { backgroundColor: colors.primary }, st]} />;
}

// Chaque ligne = segments [texte, or ?] ; posés en ligne pour rester compatibles avec le texte or natif.
const TITLES: Record<string, [string, boolean][][]> = {
  profile: [[["Crée ton profil", true]], [["et montre ton talent", false]]],
  collab: [[["Collabore", true], [" avec", false]], [["des marques", false]]],
  grow: [[["Un espace ", false], ["pour", true]], [["grandir ", false], ["ensemble", true]]],
};

function Title({ k }: { k: string }) {
  return (
    <View>
      {TITLES[k].map((line, i) => (
        <View key={i} style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {line.map(([t, gold]) =>
            gold ? (
              <GoldText key={t} style={styles.title}>
                {t}
              </GoldText>
            ) : (
              <Text key={t} style={styles.title}>
                {t}
              </Text>
            ),
          )}
        </View>
      ))}
    </View>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const userId = useDB((s) => s.userId);
  const role = useDB((s) => s.profiles.find((p) => p.user_id === s.userId)?.role);
  const demoSignIn = useDB((s) => s.demoSignIn);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<Role>("creator");
  const list = useRef<FlatList>(null);

  if (userId) return <Redirect href={role === "admin" ? "/admin" : "/(tabs)/home"} />;

  const go = (i: number) => list.current?.scrollToIndex({ index: i, animated: true });
  const finish = () => router.push(`/auth/signup?role=${chosen}`);
  const pick = (r: Role) => {
    setChosen(r);
    go(1);
  };
  const demo = (r: Role) => {
    demoSignIn(r);
    router.replace(r === "admin" ? "/admin" : "/(tabs)/home");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        ref={list}
        style={{ flex: 1 }}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        onScroll={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        scrollEventThrottle={64}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        renderItem={({ item, index: i }) =>
          i === 0 ? (
            <View style={{ width: W, height: H }}>
              <Image source={IMG.hero} style={styles.heroImg} contentFit="cover" transition={400} />
              <LinearGradient colors={["#0B0B0B", "rgba(11,11,11,0.15)", "rgba(11,11,11,0)", "rgba(11,11,11,0.9)", "#0B0B0B"]} locations={[0, 0.3, 0.45, 0.72, 0.85]} style={StyleSheet.absoluteFill} />
              <View style={[styles.welcome, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 18 }]}>
                <Animated.View entering={FadeIn.duration(900)} style={{ alignItems: "center" }}>
                  <Image source={IMG.logo} style={styles.logo} contentFit="contain" />
                </Animated.View>
                <View style={{ flex: 1 }} />
                <Animated.Text entering={FadeInDown.delay(300).springify()} style={styles.script}>
                  Le talent crée{"\n"}des opportunités.
                </Animated.Text>
                <Animated.Text entering={FadeInDown.delay(420).springify()} style={styles.welcomeBody}>
                  La plateforme qui connecte les créateurs de contenu africains avec des marques ambitieuses.
                </Animated.Text>
                <Animated.View entering={FadeInDown.delay(540).springify()} style={{ gap: 12, marginTop: 22 }}>
                  <Press onPress={() => pick("creator")} style={[styles.roleBtn, goldGlow]} scaleTo={0.97}>
                    <GoldFill style={{ borderRadius: radius.pill }} />
                    <Ionicons name="person-outline" size={22} color={colors.onPrimary} />
                    <Text style={[styles.ctaText, { flex: 1 }]}>Je suis créateur</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />
                  </Press>
                  <Press onPress={() => pick("brand")} style={[styles.roleBtn, styles.roleOutline]} scaleTo={0.97}>
                    <Ionicons name="business-outline" size={22} color={colors.primary} />
                    <Text style={[styles.ctaText, { flex: 1, color: colors.ink }]}>Je suis une marque</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                  </Press>
                </Animated.View>
                <Dots i={0} />
                <View style={styles.smallRow}>
                  <Text style={type.tiny} onPress={() => router.push("/auth/login")}>
                    Déjà membre ? <Text style={{ color: colors.primary }}>Se connecter</Text>
                  </Text>
                  <Text style={type.tiny}>·</Text>
                  {(
                    [
                      ["creator", "Démo créateur"],
                      ["brand", "Démo marque"],
                      ["admin", "Admin"],
                    ] as const
                  ).map(([r, l]) => (
                    <Text key={r} style={[type.tiny, { color: colors.inkSoft }]} onPress={() => demo(r)}>
                      {l}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.page, { width: W, height: H, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }]}>
              <Press onPress={finish} style={styles.skip}>
                <Text style={styles.skipText}>Passer</Text>
              </Press>
              <View style={{ paddingHorizontal: 26, gap: 14 }}>
                <Title k={item.key} />
                <Text style={styles.body}>{item.body}</Text>
              </View>
              <View style={styles.imageWrap}>
                <Image source={item.image} style={styles.image} contentFit="contain" transition={400} />
                <LinearGradient colors={["rgba(11,11,11,0)", "#0B0B0B"]} locations={[0.82, 1]} style={StyleSheet.absoluteFill} />
              </View>
              {item.features ? (
                <View style={styles.features}>
                  {item.features.map((f: Feature) => (
                    <View key={f.label} style={styles.feature}>
                      <View style={styles.featureIcon}>
                        <Ionicons name={f.icon} size={24} color={colors.primary} />
                      </View>
                      <Text style={styles.featureText}>{f.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={{ alignItems: "center", gap: 18, marginTop: 18 }}>
                <GoldCta label={item.cta} onPress={() => (i === SLIDES.length - 1 ? finish() : go(i + 1))} />
                <Dots i={i} />
              </View>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroImg: { position: "absolute", top: "20%", left: 0, right: 0, height: "60%" },
  welcome: { flex: 1, paddingHorizontal: 22 },
  logo: { width: 250, height: 166 },
  script: { fontFamily: fonts.serifItalic, color: colors.primaryLight, fontSize: 28, lineHeight: 34, transform: [{ rotate: "-6deg" }], marginBottom: 18, marginLeft: 6 },
  welcomeBody: { color: colors.inkSoft, fontSize: 17, lineHeight: 25 },
  roleBtn: { flexDirection: "row", alignItems: "center", gap: 14, height: 60, borderRadius: radius.pill, paddingHorizontal: 24 },
  roleOutline: { borderWidth: 1.2, borderColor: colors.primary, backgroundColor: "rgba(11,11,11,0.6)" },
  page: { flex: 1, justifyContent: "space-between" },
  skip: { alignSelf: "flex-end", paddingHorizontal: 24, paddingVertical: 10 },
  skipText: { color: colors.ink, fontSize: 16, fontWeight: "500" },
  title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 32, lineHeight: 38 },
  body: { color: colors.inkSoft, fontSize: 16, lineHeight: 24 },
  imageWrap: { flex: 1, minHeight: 220, marginTop: 16, marginHorizontal: 6 },
  image: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  features: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 12, marginTop: 6 },
  feature: { alignItems: "center", gap: 10, flex: 1 },
  featureIcon: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: goldBorder, backgroundColor: "rgba(216,173,106,0.06)", alignItems: "center", justifyContent: "center" },
  featureText: { color: colors.ink, fontSize: 13, textAlign: "center", lineHeight: 18 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 58, minWidth: 250, paddingHorizontal: 34, borderRadius: radius.pill },
  ctaText: { color: colors.onPrimary, fontSize: 18, fontWeight: "700" },
  dots: { flexDirection: "row", gap: 10, justifyContent: "center", marginTop: 20 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.inkSoft },
  smallRow: { flexDirection: "row", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 },
});
