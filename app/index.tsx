// Page d'arrivée (visiteur non connecté) : créateurs en vedette au premier plan.
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import { useMemo } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CreatorTile, totalFollowers } from "../src/components/home/CreatorTile";
import { useDB } from "../src/store";
import { colors, fonts, radius, type } from "../src/theme";
import { Role } from "../src/types";
import { Logo, Press } from "../src/ui";

const W = Dimensions.get("window").width;
const HERO_IMG = "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=900&q=75";
const PROMO_IMG = "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=75";

const CATS: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Toutes", icon: "grid-outline" },
  { label: "Beauté", icon: "color-palette-outline" },
  { label: "Mode", icon: "shirt-outline" },
  { label: "Tech", icon: "desktop-outline" },
  { label: "Alimentation", icon: "restaurant-outline" },
  { label: "Voyage", icon: "airplane-outline" },
];

export default function Landing() {
  const insets = useSafeAreaInsets();
  const userId = useDB((s) => s.userId);
  const profiles = useDB((s) => s.profiles);
  const role = useDB((s) => s.profiles.find((p) => p.user_id === s.userId)?.role);
  const demoSignIn = useDB((s) => s.demoSignIn);
  const featured = useMemo(
    () => profiles.filter((p) => p.role === "creator" && !p.is_banned).sort((a, b) => totalFollowers(b) - totalFollowers(a)).slice(0, 8),
    [profiles],
  );

  if (userId) return <Redirect href={role === "admin" ? "/admin" : "/(tabs)/home"} />;

  const demo = (r: Role) => {
    demoSignIn(r);
    router.replace(r === "admin" ? "/admin" : "/(tabs)/home");
  };
  const seeCreators = () => router.push("/auth/signup?role=brand");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Héros */}
        <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <Animated.View entering={FadeIn.duration(700)} style={styles.heroImgWrap}>
            <Image source={HERO_IMG} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
            <LinearGradient colors={["#0B0B0B", "rgba(11,11,11,0.35)", "rgba(11,11,11,0)"]} locations={[0, 0.45, 0.8]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={["rgba(11,11,11,0)", "#0B0B0B"]} locations={[0.7, 1]} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View style={styles.goldArc} />

          <View style={styles.topBar}>
            <Logo size={40} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Press onPress={() => router.push("/auth/login")} style={styles.roundBtn} scaleTo={0.9}>
                <Ionicons name="notifications-outline" size={20} color={colors.ink} />
                <View style={styles.dot} />
              </Press>
              <Press onPress={seeCreators} style={styles.roundBtn} scaleTo={0.9}>
                <Ionicons name="search-outline" size={20} color={colors.ink} />
              </Press>
            </View>
          </View>

          <Animated.Text entering={FadeInDown.delay(150).springify()} style={styles.title}>
            Des{"\n"}créateurs{"\n"}
            <Text style={{ color: colors.primary }}>de talent</Text>
            {"\n"}pour des{"\n"}marques{"\n"}
            <Text style={{ color: colors.primary }}>ambitieuses.</Text>
          </Animated.Text>

          <Animated.Text entering={FadeInRight.delay(500)} style={styles.script}>
            Créativité{"\n"}Influence{"\n"}Résultats
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Press onPress={seeCreators} style={styles.heroCta} scaleTo={0.95}>
              <Text style={styles.heroCtaText}>Voir les créateurs</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
            </Press>
          </Animated.View>
        </View>

        {/* Catégories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 14, paddingVertical: 8 }}>
          {CATS.map((c, i) => (
            <Animated.View key={c.label} entering={FadeInDown.delay(350 + i * 50).springify()}>
              <Press onPress={seeCreators} style={{ alignItems: "center", gap: 8 }} scaleTo={0.9}>
                <View style={[styles.catIcon, i === 0 && styles.catOn]}>
                  <Ionicons name={c.icon} size={24} color={i === 0 ? colors.onPrimary : colors.ink} />
                </View>
                <Text style={[styles.catLabel, i === 0 && { fontWeight: "700" }]}>{c.label}</Text>
              </Press>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Créateurs en vedette */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Créateurs en vedette</Text>
          <Press onPress={seeCreators} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={styles.seeAll}>Voir tout</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </Press>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }} decelerationRate="fast" snapToInterval={152}>
          {featured.map((p, i) => (
            <Animated.View key={p.user_id} entering={FadeInRight.delay(450 + i * 70).springify()}>
              <CreatorTile p={p} width={142} variant="featured" />
            </Animated.View>
          ))}
        </ScrollView>

        {/* Promo créateurs */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <Press onPress={() => router.push("/auth/signup?role=creator")} style={styles.promo} scaleTo={0.98}>
            <Image source={PROMO_IMG} style={styles.promoImg} contentFit="cover" transition={300} />
            <LinearGradient colors={["rgba(11,11,11,0)", "rgba(11,11,11,0.9)", "#0B0B0B"]} locations={[0, 0.42, 0.6]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Les marques{"\n"}te recherchent !</Text>
              <Text style={styles.promoSub}>Reçois des opportunités adaptées à ton profil.</Text>
              <View style={styles.promoCta}>
                <Text style={styles.heroCtaText}>Créer mon profil</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
              </View>
            </View>
          </Press>
        </Animated.View>

        {/* Entrées */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 26 }}>
          <Press onPress={() => router.push("/auth/signup?role=creator")} style={styles.mainBtn} scaleTo={0.97}>
            <Text style={styles.heroCtaText}>Je suis créateur</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
          </Press>
          <Press onPress={() => router.push("/auth/signup?role=brand")} style={styles.outlineBtn} scaleTo={0.97}>
            <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }}>Je suis une marque</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
          </Press>
          <Text style={[type.small, { textAlign: "center", marginTop: 6 }]} onPress={() => router.push("/auth/login")}>
            Déjà membre ? <Text style={{ color: colors.primary, fontWeight: "700" }}>Se connecter</Text>
          </Text>
        </View>

        <View style={styles.demo}>
          <Ionicons name="flask-outline" size={14} color={colors.muted} />
          <Text style={type.tiny}>Mode démo</Text>
          {(
            [
              ["creator", "Créateur"],
              ["brand", "Marque"],
              ["admin", "Admin"],
            ] as const
          ).map(([r, l]) => (
            <Press key={r} onPress={() => demo(r)} style={styles.demoChip} scaleTo={0.92}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.inkSoft }}>{l}</Text>
            </Press>
          ))}
        </View>

        <View style={styles.footer}>
          {(
            [
              ["CGU", "/legal/terms"],
              ["Confidentialité", "/legal/privacy"],
              ["Sécurité des enfants", "/legal/child-safety"],
              ["Contact", "/contact"],
            ] as const
          ).map(([l, h], i) => (
            <Text key={h} style={styles.footLink} onPress={() => router.push(h)}>
              {i > 0 ? "·  " : ""}
              {l}
            </Text>
          ))}
        </View>
        <Text style={[type.tiny, { textAlign: "center", marginTop: 8 }]}>© {new Date().getFullYear()} Collab Créa</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 540, paddingHorizontal: 20, paddingBottom: 24, justifyContent: "space-between" },
  heroImgWrap: { position: "absolute", top: 0, right: 0, bottom: 0, width: W * 0.78 },
  goldArc: { position: "absolute", right: -W * 0.35, top: 120, width: W * 0.9, height: W * 0.9, borderRadius: W, borderWidth: 1, borderColor: "rgba(216,173,106,0.35)" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "rgba(248,246,242,0.25)", backgroundColor: "rgba(11,11,11,0.45)", alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 40, lineHeight: 44, marginTop: 30, maxWidth: W * 0.62 },
  script: { position: "absolute", right: 22, bottom: 96, fontFamily: fonts.serifItalic, color: colors.primaryLight, fontSize: 16, lineHeight: 22, textAlign: "right", transform: [{ rotate: "-8deg" }] },
  heroCta: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", backgroundColor: colors.primary, height: 52, paddingHorizontal: 26, borderRadius: radius.pill, marginTop: 24 },
  heroCtaText: { color: colors.onPrimary, fontWeight: "700", fontSize: 16 },
  catIcon: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  catOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  catLabel: { color: colors.ink, fontSize: 12, fontWeight: "500" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: "700" },
  seeAll: { color: colors.primary, fontWeight: "600", fontSize: 14 },
  promo: { height: 170, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: "rgba(216,173,106,0.45)", backgroundColor: colors.surface, flexDirection: "row", justifyContent: "flex-end" },
  promoImg: { position: "absolute", left: 0, top: 0, bottom: 0, width: "55%" },
  promoText: { width: "56%", padding: 16, justifyContent: "center", gap: 6 },
  promoTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 21, lineHeight: 25 },
  promoSub: { color: colors.inkSoft, fontSize: 12, lineHeight: 16 },
  promoCta: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", backgroundColor: colors.primary, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, marginTop: 4 },
  mainBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: radius.pill, backgroundColor: colors.primary },
  outlineBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: radius.pill, borderWidth: 1.2, borderColor: colors.primary },
  demo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 26, flexWrap: "wrap", paddingHorizontal: 20 },
  demoChip: { paddingHorizontal: 12, height: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, justifyContent: "center", backgroundColor: colors.surface },
  footer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 22, paddingHorizontal: 20 },
  footLink: { fontSize: 12, color: colors.inkSoft, fontWeight: "600" },
});
